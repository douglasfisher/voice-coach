import Link from "next/link"
import { LayoutGrid, List, Palette, Plus, Search } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { PERSONA_TYPES } from "@/lib/personas/constants"
import { PersonaAvatar } from "@/components/admin/personas/persona-avatar"
import { PersonaCard } from "@/components/admin/personas/persona-card"
import { PersonalityBars } from "@/components/admin/personas/personality-bars"
import { PersonaRowActions } from "@/components/admin/personas/row-actions"
import { ActiveToggle } from "@/components/admin/personas/active-toggle"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Personas · Dialectica Admin" }

// Larger page size for the grid because cards are denser visually than rows.
const PAGE_SIZE_GRID = 48
const PAGE_SIZE_TABLE = 30

type Filters = {
  q: string
  type: "all" | "coach" | "challenger" | "advisor"
  domain: string | "all"
  status: "all" | "active" | "inactive"
  page: number
  view: "grid" | "table"
  theme: "styled" | "neutral"
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>
): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const type = get("type")
  const status = get("status")
  const view = get("view")
  const theme = get("theme")
  return {
    q: (get("q") ?? "").trim(),
    type:
      type === "coach" || type === "challenger" || type === "advisor"
        ? type
        : "all",
    domain: get("domain") ?? "all",
    // Default to active-only — matches what the mobile app shows. Orphan
    // duplicates from earlier regeneration runs sit at is_active=false
    // and would otherwise confuse the list. Toggle to "all" or "inactive"
    // to surface them.
    status:
      status === "all" || status === "inactive" ? status : "active",
    page: Math.max(1, Number(get("page") ?? 1) || 1),
    view: view === "table" ? "table" : "grid",
    theme: theme === "neutral" ? "neutral" : "styled",
  }
}

async function loadPersonas(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const pageSize =
    filters.view === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE
  const from = (filters.page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("personas")
    .select(
      "id, name, tagline, persona_type, challenge_style, coaching_style, domain_id, advisor_category_id, is_active, is_premium, sort_order, avatar_url, avatar_thumbnail_url, age_range, gender, warmth, directness, patience, humor, formality, created_at",
      { count: "exact" }
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .range(from, to)

  if (filters.type !== "all") query = query.eq("persona_type", filters.type)
  if (filters.domain !== "all") query = query.eq("domain_id", filters.domain)
  if (filters.status === "active") query = query.eq("is_active", true)
  if (filters.status === "inactive") query = query.eq("is_active", false)
  if (filters.q) query = query.ilike("name", `%${filters.q}%`)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { rows: data ?? [], total: count ?? 0 }
}

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await requireAdminPage()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const [{ rows, total }, lookups] = await Promise.all([
    loadPersonas(filters),
    loadPersonaLookups(),
  ])

  const pageSize =
    filters.view === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (filters.page - 1) * pageSize + 1
  const end = Math.min(filters.page * pageSize, total)

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Coaches, advisors, and challengers."
        actions={
          <div className="flex items-center gap-2">
            {filters.view === "grid" ? (
              <ThemeToggle filters={filters} />
            ) : null}
            <ViewToggle filters={filters} />
            <Button render={<Link href="/admin/personas/new" />}>
              <Plus className="mr-1 size-4" />
              New persona
            </Button>
          </div>
        }
      />

      <form className="my-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value={filters.view} />
        <input type="hidden" name="theme" value={filters.theme} />
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by name…"
            className="pl-8"
          />
        </div>
        <Select name="type" defaultValue={filters.type}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PERSONA_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="domain" defaultValue={filters.domain}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {lookups.domains.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="status" defaultValue={filters.status}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">Show all</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {filters.view === "grid" ? (
        rows.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
            No personas match this filter.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {rows.map((p) => {
              const domain = lookups.domains.find((d) => d.id === p.domain_id)
              return (
                <PersonaCard
                  key={p.id}
                  theme={filters.theme}
                  persona={{
                    id: p.id,
                    name: p.name,
                    tagline: p.tagline,
                    persona_type: p.persona_type,
                    challenge_style: p.challenge_style ?? null,
                    is_active: p.is_active,
                    is_premium: p.is_premium,
                    avatar_url: p.avatar_url,
                    avatar_thumbnail_url: p.avatar_thumbnail_url,
                    domain_name: domain?.name ?? null,
                  }}
                />
              )
            })}
          </div>
        )
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3">Persona</TableHead>
              <TableHead className="py-3">Type</TableHead>
              <TableHead className="py-3">Domain / Category</TableHead>
              <TableHead className="hidden py-3 lg:table-cell">
                Personality
              </TableHead>
              <TableHead className="hidden py-3 md:table-cell">
                Created
              </TableHead>
              <TableHead className="py-3">Status</TableHead>
              <TableHead className="w-10 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No personas match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const domain = lookups.domains.find(
                  (d) => d.id === p.domain_id
                )
                const advisorCat = lookups.advisorCategories.find(
                  (c) => c.id === p.advisor_category_id
                )
                const styleLabel =
                  p.coaching_style ??
                  p.challenge_style ??
                  null
                return (
                  <TableRow
                    key={p.id}
                    className="group hover:bg-muted/40 relative cursor-pointer"
                  >
                    <TableCell className="py-3">
                      {/* Row-wide click target. focus-visible kept on the
                          dedicated Edit button so keyboard users still get
                          a discrete focus ring rather than the entire row. */}
                      <Link
                        href={`/admin/personas/${p.id}`}
                        aria-label={`Edit ${p.name}`}
                        tabIndex={-1}
                        className="absolute inset-0 z-0"
                      />
                      <div className="relative z-10 flex items-start gap-3">
                        <PersonaAvatar
                          name={p.name}
                          url={p.avatar_url}
                          thumbnailUrl={p.avatar_thumbnail_url}
                          className="w-16 rounded-lg text-base"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="truncate text-sm font-semibold">
                            {p.name}
                          </div>
                          {p.tagline ? (
                            <div className="text-muted-foreground line-clamp-1 max-w-md text-xs">
                              {p.tagline}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                            {styleLabel ? (
                              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono">
                                {styleLabel.replace(/_/g, " ")}
                              </span>
                            ) : null}
                            {p.gender ? (
                              <span className="text-muted-foreground">
                                {p.gender}
                              </span>
                            ) : null}
                            {p.age_range ? (
                              <span className="text-muted-foreground">
                                · {p.age_range}
                              </span>
                            ) : null}
                            <span className="text-muted-foreground">
                              · #{p.sort_order ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 py-3 align-top">
                      <TypePill type={p.persona_type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground relative z-10 py-3 align-top text-sm">
                      {domain?.name ?? advisorCat?.name ?? "—"}
                    </TableCell>
                    <TableCell className="relative z-10 hidden py-3 align-top lg:table-cell">
                      <PersonalityBars
                        warmth={p.warmth}
                        directness={p.directness}
                        patience={p.patience}
                        humor={p.humor}
                        formality={p.formality}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground relative z-10 hidden py-3 align-top text-xs md:table-cell">
                      {formatRelative(p.created_at)}
                    </TableCell>
                    <TableCell className="relative z-10 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <ActiveToggle
                          personaId={p.id}
                          personaName={p.name}
                          isActive={Boolean(p.is_active)}
                        />
                        {p.is_premium ? (
                          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
                            Premium
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 py-3 text-right align-top">
                      <PersonaRowActions
                        personaId={p.id}
                        personaName={p.name}
                        actorRole={ctx.role}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}

      <Pager filters={filters} pageCount={pageCount} start={start} end={end} total={total} />
    </div>
  )
}

function TypePill({ type }: { type: string | null }) {
  const tint =
    type === "coach"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : type === "challenger"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
        : type === "advisor"
          ? "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30"
          : "bg-muted text-muted-foreground border-border"
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
        tint
      )}
    >
      {type ?? "—"}
    </span>
  )
}

function ViewToggle({ filters }: { filters: Filters }) {
  return (
    <div className="bg-muted/40 inline-flex items-center rounded-md border p-0.5">
      <SegLink
        filters={filters}
        param="view"
        value="grid"
        active={filters.view === "grid"}
        Icon={LayoutGrid}
        label="Grid"
      />
      <SegLink
        filters={filters}
        param="view"
        value="table"
        active={filters.view === "table"}
        Icon={List}
        label="Table"
      />
    </div>
  )
}

function ThemeToggle({ filters }: { filters: Filters }) {
  return (
    <div className="bg-muted/40 inline-flex items-center rounded-md border p-0.5">
      <SegLink
        filters={filters}
        param="theme"
        value="styled"
        active={filters.theme === "styled"}
        Icon={Palette}
        label="Styled"
      />
      <SegLink
        filters={filters}
        param="theme"
        value="neutral"
        active={filters.theme === "neutral"}
        Icon={Palette}
        label="Neutral"
      />
    </div>
  )
}

function SegLink({
  filters,
  param,
  value,
  active,
  Icon,
  label,
}: {
  filters: Filters
  param: "view" | "theme"
  value: string
  active: boolean
  Icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set("q", filters.q)
  if (filters.type !== "all") sp.set("type", filters.type)
  if (filters.domain !== "all") sp.set("domain", filters.domain)
  if (filters.status !== "all") sp.set("status", filters.status)
  // Carry the *other* segment so toggling one doesn't reset the other.
  if (param === "view") {
    if (filters.theme !== "styled") sp.set("theme", filters.theme)
    if (value !== "grid") sp.set("view", value)
  } else {
    if (filters.view !== "grid") sp.set("view", filters.view)
    if (value !== "styled") sp.set("theme", value)
  }
  const qs = sp.toString()
  const href = qs ? `/admin/personas?${qs}` : "/admin/personas"
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={
        active
          ? "bg-background flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm shadow-sm"
          : "text-muted-foreground flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm"
      }
    >
      <Icon className="size-3.5" />
      {label}
    </Link>
  )
}

function Pager({
  filters,
  pageCount,
  start,
  end,
  total,
}: {
  filters: Filters
  pageCount: number
  start: number
  end: number
  total: number
}) {
  const linkFor = (page: number) => {
    const sp = new URLSearchParams()
    if (filters.q) sp.set("q", filters.q)
    if (filters.type !== "all") sp.set("type", filters.type)
    if (filters.domain !== "all") sp.set("domain", filters.domain)
    if (filters.status !== "all") sp.set("status", filters.status)
    if (filters.view !== "grid") sp.set("view", filters.view)
    if (filters.theme !== "styled") sp.set("theme", filters.theme)
    if (page !== 1) sp.set("page", String(page))
    const qs = sp.toString()
    return qs ? `/admin/personas?${qs}` : "/admin/personas"
  }
  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        {total === 0
          ? "No results"
          : `Showing ${start}–${end} of ${total.toLocaleString()}`}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={filters.page <= 1}
          render={<Link href={linkFor(Math.max(1, filters.page - 1))} />}
        >
          Previous
        </Button>
        <div className="text-muted-foreground self-center px-2 text-sm tabular-nums">
          {filters.page} / {pageCount}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={filters.page >= pageCount}
          render={<Link href={linkFor(Math.min(pageCount, filters.page + 1))} />}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
