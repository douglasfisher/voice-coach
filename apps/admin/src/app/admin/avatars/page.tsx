import Link from "next/link"
import { Search } from "lucide-react"

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
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatRelative } from "@/lib/format"

export const metadata = { title: "Avatars · Dialectica Admin" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 60

type Filters = {
  q: string
  gender: "all" | "male" | "female" | string
  ethnicity: "all" | string
  status: "all" | "used" | "unused"
  kind: "all" | "draft" | "hires"
  page: number
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>
): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const gender = get("gender") ?? "all"
  const ethnicity = get("ethnicity") ?? "all"
  const status = get("status") ?? "all"
  const kind = get("kind") ?? "all"
  return {
    q: (get("q") ?? "").trim(),
    gender,
    ethnicity,
    status: status === "used" || status === "unused" ? status : "all",
    kind: kind === "draft" || kind === "hires" ? kind : "all",
    page: Math.max(1, Number(get("page") ?? 1) || 1),
  }
}

async function loadAvatars(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("avatar_library")
    .select(
      "id, storage_path, public_url, prompt, params, gender, ethnicity, generation_batch_id, is_hi_res, used_by_persona_id, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.gender !== "all") query = query.eq("gender", filters.gender)
  if (filters.ethnicity !== "all")
    query = query.eq("ethnicity", filters.ethnicity)
  if (filters.status === "used") query = query.not("used_by_persona_id", "is", null)
  if (filters.status === "unused") query = query.is("used_by_persona_id", null)
  if (filters.kind === "hires") query = query.eq("is_hi_res", true)
  if (filters.kind === "draft") query = query.eq("is_hi_res", false)
  if (filters.q) {
    query = query.or(
      `prompt.ilike.%${filters.q}%,storage_path.ilike.%${filters.q}%`
    )
  }

  const { data, count } = await query
  return { rows: data ?? [], total: count ?? 0 }
}

async function loadFilterOptions() {
  const supabase = await createSupabaseServerClient()
  const [genders, ethnicities] = await Promise.all([
    supabase
      .from("avatar_library")
      .select("gender")
      .not("gender", "is", null),
    supabase
      .from("avatar_library")
      .select("ethnicity")
      .not("ethnicity", "is", null),
  ])
  return {
    genders: Array.from(
      new Set((genders.data ?? []).map((r) => r.gender).filter(Boolean))
    ).sort() as string[],
    ethnicities: Array.from(
      new Set(
        (ethnicities.data ?? []).map((r) => r.ethnicity).filter(Boolean)
      )
    ).sort() as string[],
  }
}

async function loadPersonaNamesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("personas")
    .select("id, name")
    .in("id", ids)
  return new Map((data ?? []).map((p) => [p.id, p.name]))
}

export default async function AvatarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdminPage()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const [{ rows, total }, options] = await Promise.all([
    loadAvatars(filters),
    loadFilterOptions(),
  ])

  const usedIds = Array.from(
    new Set(rows.map((r) => r.used_by_persona_id).filter(Boolean) as string[])
  )
  const personaNames = await loadPersonaNamesByIds(usedIds)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1
  const end = Math.min(filters.page * PAGE_SIZE, total)

  return (
    <div>
      <PageHeader
        title="Avatar library"
        description={`${total.toLocaleString()} catalogued avatars across ${rows.length === 0 ? 0 : "many"} batches. Click to enlarge or copy a URL.`}
      />

      <form className="my-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Search prompt or path…"
            className="pl-8"
          />
        </div>
        <Select name="gender" defaultValue={filters.gender}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            {options.genders.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="ethnicity" defaultValue={filters.ethnicity}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Ethnicity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ethnicities</SelectItem>
            {options.ethnicities.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="kind" defaultValue={filters.kind}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="hires">Hi-res</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
        <Select name="status" defaultValue={filters.status}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
            <SelectItem value="used">In use</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {rows.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-16 text-center text-sm">
          No avatars match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {rows.map((row) => {
            const personaName = row.used_by_persona_id
              ? personaNames.get(row.used_by_persona_id)
              : null
            return (
              <div
                key={row.id}
                className="group bg-muted relative aspect-[3/4] overflow-hidden rounded-lg border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.public_url}
                  alt={row.prompt ?? row.storage_path}
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                  {row.is_hi_res ? (
                    <Badge className="bg-amber-500/90 text-amber-950 hover:bg-amber-500">
                      Hi-res
                    </Badge>
                  ) : null}
                  {personaName ? (
                    <Badge variant="secondary" className="bg-emerald-500/85 text-emerald-950 hover:bg-emerald-500/85">
                      In use
                    </Badge>
                  ) : null}
                </div>
                <div className="from-background/95 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="text-[10px] leading-tight">
                    {row.gender ? (
                      <span className="text-muted-foreground">{row.gender}</span>
                    ) : null}
                    {row.gender && row.ethnicity ? (
                      <span className="text-muted-foreground"> · </span>
                    ) : null}
                    {row.ethnicity ? (
                      <span className="text-muted-foreground">{row.ethnicity}</span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    {formatRelative(row.created_at)}
                  </div>
                  {personaName ? (
                    <Link
                      href={`/admin/personas/${row.used_by_persona_id}`}
                      className="text-primary mt-1 block truncate text-[11px] font-medium hover:underline"
                    >
                      {personaName}
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pager filters={filters} pageCount={pageCount} start={start} end={end} total={total} />
    </div>
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
    if (filters.gender !== "all") sp.set("gender", filters.gender)
    if (filters.ethnicity !== "all") sp.set("ethnicity", filters.ethnicity)
    if (filters.status !== "all") sp.set("status", filters.status)
    if (filters.kind !== "all") sp.set("kind", filters.kind)
    if (page !== 1) sp.set("page", String(page))
    const qs = sp.toString()
    return qs ? `/admin/avatars?${qs}` : "/admin/avatars"
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
