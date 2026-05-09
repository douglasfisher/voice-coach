import Link from "next/link"

import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ConversationRowLink } from "./conversation-row-link"
import { ConversationsFilterBar } from "./filter-bar"

export const metadata = { title: "Conversations · Dialectica Admin" }
// Re-read filters/pagination on every visit; the conversations table
// changes frequently so caching would only confuse admins.
export const dynamic = "force-dynamic"

const PAGE_SIZE = 30

type Filters = {
  q: string
  status: "all" | "active" | "ended"
  range: "7d" | "30d" | "90d" | "all"
  page: number
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>
): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const status = get("status")
  const range = get("range")
  return {
    q: (get("q") ?? "").trim(),
    status: status === "active" || status === "ended" ? status : "all",
    // Default to "all" so admins see every conversation on first visit;
    // they can narrow with the dropdown rather than miss data because of
    // a hidden 30-day window.
    range:
      range === "7d" || range === "30d" || range === "90d" ? range : "all",
    page: Math.max(1, Number(get("page") ?? 1) || 1),
  }
}

function rangeSinceIso(range: Filters["range"]): string | null {
  if (range === "all") return null
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

type ConvRow = {
  id: string
  user_id: string
  persona_id: string
  title: string | null
  topic: string | null
  status: string | null
  started_at: string | null
  ended_at: string | null
  overall_score: number | null
  interaction_mode: string | null
  current_phase: string | null
  created_at: string | null
}

async function loadConversations(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("conversations")
    .select(
      "id, user_id, persona_id, title, topic, status, started_at, ended_at, overall_score, interaction_mode, current_phase, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  const since = rangeSinceIso(filters.range)
  if (since) query = query.gte("created_at", since)
  // status column is freeform text; treat anything non-null other than
  // "active" as "ended" for filter purposes. The detail view shows raw.
  if (filters.status === "active") query = query.eq("status", "active")
  if (filters.status === "ended") query = query.neq("status", "active")
  // Title is often null; ilike on title returns no rows for those, so
  // also OR against id-prefix to support quick lookup by partial UUID.
  if (filters.q) {
    if (filters.q.length >= 4) {
      query = query.or(
        `title.ilike.%${filters.q}%,id.ilike.${filters.q}%`
      )
    } else {
      query = query.ilike("title", `%${filters.q}%`)
    }
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ConvRow[]

  // Resolve persona names, user emails, message counts, and total
  // spend per conversation in one round-trip each. Each query is
  // bounded by the visible page (≤30 IDs).
  const ids = rows.map((r) => r.id)
  const personaIds = Array.from(new Set(rows.map((r) => r.persona_id)))
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))

  const [personasQ, usersQ, msgsQ, usageQ] = await Promise.all([
    personaIds.length
      ? supabase
          .from("personas")
          .select("id, name, persona_type")
          .in("id", personaIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("admin_users_overview")
          .select("id, email, display_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("ai_usage")
          .select("conversation_id, estimated_cost_cents, total_tokens")
          .in("conversation_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  const personaMap = new Map(
    ((personasQ.data ?? []) as Array<{
      id: string
      name: string
      persona_type: string | null
    }>).map((p) => [p.id, p])
  )
  const userMap = new Map(
    ((usersQ.data ?? []) as Array<{
      id: string
      email: string | null
      display_name: string | null
    }>).map((u) => [u.id, u])
  )
  const msgCountMap = new Map<string, number>()
  for (const m of (msgsQ.data ?? []) as Array<{ conversation_id: string }>) {
    msgCountMap.set(
      m.conversation_id,
      (msgCountMap.get(m.conversation_id) ?? 0) + 1
    )
  }
  const costMap = new Map<string, { cents: number; tokens: number }>()
  for (const u of (usageQ.data ?? []) as Array<{
    conversation_id: string
    estimated_cost_cents: number | null
    total_tokens: number | null
  }>) {
    const cur = costMap.get(u.conversation_id) ?? { cents: 0, tokens: 0 }
    cur.cents += u.estimated_cost_cents ?? 0
    cur.tokens += u.total_tokens ?? 0
    costMap.set(u.conversation_id, cur)
  }

  return {
    rows,
    total: count ?? 0,
    personaMap,
    userMap,
    msgCountMap,
    costMap,
  }
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdminPage()
  const sp = await searchParams
  const filters = parseFilters(sp)
  const { rows, total, personaMap, userMap, msgCountMap, costMap } =
    await loadConversations(filters)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1
  const end = Math.min(filters.page * PAGE_SIZE, total)

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Sessions across all users. Drill in for messages and per-call AI usage."
      />

      <ConversationsFilterBar
        initialQ={filters.q}
        initialStatus={filters.status}
        initialRange={filters.range}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3">Conversation</TableHead>
              <TableHead className="py-3">Persona</TableHead>
              <TableHead className="py-3">User</TableHead>
              <TableHead className="hidden py-3 md:table-cell">
                Started
              </TableHead>
              <TableHead className="py-3 text-right">Messages</TableHead>
              <TableHead className="py-3 text-right">Spend</TableHead>
              <TableHead className="py-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No conversations match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const persona = personaMap.get(c.persona_id)
                const user = userMap.get(c.user_id)
                const msgCount = msgCountMap.get(c.id) ?? 0
                const cost = costMap.get(c.id) ?? { cents: 0, tokens: 0 }
                const isActive = c.status === "active"
                const href = `/admin/conversations/${c.id}`
                return (
                  <ConversationRowLink key={c.id} href={href}>
                    <TableCell className="py-3">
                      <Link
                        href={href}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        aria-label={`View conversation ${c.id}`}
                      >
                        <div className="truncate text-sm font-medium">
                          {c.title || (
                            <span className="text-muted-foreground italic">
                              (no title)
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {c.id.slice(0, 8)}…
                          {c.topic ? ` · ${c.topic}` : ""}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 align-top text-sm">
                      {persona?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {persona?.persona_type ? (
                        <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                          {persona.persona_type}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-3 align-top text-sm">
                      {user?.display_name || user?.email || (
                        <span className="text-muted-foreground font-mono text-xs">
                          {c.user_id.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-3 align-top text-xs md:table-cell">
                      {formatRelative(c.started_at ?? c.created_at)}
                    </TableCell>
                    <TableCell className="py-3 text-right align-top text-sm tabular-nums">
                      {msgCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 text-right align-top text-sm tabular-nums">
                      ${(cost.cents / 100).toFixed(3)}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                          isActive
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {c.status ?? "—"}
                      </span>
                    </TableCell>
                  </ConversationRowLink>
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
    if (filters.status !== "all") sp.set("status", filters.status)
    if (filters.range !== "all") sp.set("range", filters.range)
    if (page !== 1) sp.set("page", String(page))
    const qs = sp.toString()
    return qs ? `/admin/conversations?${qs}` : "/admin/conversations"
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
