import Link from "next/link"
import { Plus, Search } from "lucide-react"

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

export const metadata = { title: "Personas · Dialectica Admin" }

const PAGE_SIZE = 30

type Filters = {
  q: string
  type: "all" | "coach" | "challenger" | "advisor"
  domain: string | "all"
  status: "all" | "active" | "inactive"
  page: number
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>
): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const type = get("type")
  const status = get("status")
  return {
    q: (get("q") ?? "").trim(),
    type:
      type === "coach" || type === "challenger" || type === "advisor"
        ? type
        : "all",
    domain: get("domain") ?? "all",
    status:
      status === "active" || status === "inactive" ? status : "all",
    page: Math.max(1, Number(get("page") ?? 1) || 1),
  }
}

async function loadPersonas(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("personas")
    .select(
      "id, name, tagline, persona_type, domain_id, is_active, is_premium, sort_order, avatar_url, avatar_thumbnail_url, created_at",
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
  const sp = await searchParams
  const filters = parseFilters(sp)
  const [{ rows, total }, lookups] = await Promise.all([
    loadPersonas(filters),
    loadPersonaLookups(),
  ])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1
  const end = Math.min(filters.page * PAGE_SIZE, total)

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Coaches, advisors, and challengers."
        actions={
          <Button render={<Link href="/admin/personas/new" />}>
            <Plus className="mr-1 size-4" />
            New persona
          </Button>
        }
      />

      <form className="my-4 flex flex-wrap items-center gap-2">
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
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No personas match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const domain = lookups.domains.find((d) => d.id === p.domain_id)
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted size-9 shrink-0 overflow-hidden rounded-md border">
                          {p.avatar_thumbnail_url || p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.avatar_thumbnail_url ?? p.avatar_url}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {p.name}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {p.tagline ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.persona_type ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {domain?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.sort_order ?? 0}
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Inactive
                        </span>
                      )}
                      {p.is_premium ? (
                        <Badge className="ml-1">Premium</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/admin/personas/${p.id}`} />}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

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
    if (filters.type !== "all") sp.set("type", filters.type)
    if (filters.domain !== "all") sp.set("domain", filters.domain)
    if (filters.status !== "all") sp.set("status", filters.status)
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
