import Link from "next/link"

import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatRelative } from "@/lib/format"
import type { Database } from "@/types/database"
import { UsersFilterBar } from "./filter-bar"
import { SortHeader } from "./sort-header"

export const metadata = { title: "Users · Dialectica Admin" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

type UserRow = Database["public"]["Views"]["admin_users_overview"]["Row"]

type Role = "all" | "user" | "admin" | "superadmin"
type Tier =
  | "all"
  | "free"
  | "freemium"
  | "basic"
  | "pro"
  | "enterprise"
  | "team"
type Status = "all" | "active" | "suspended"
type Joined = "all" | "7d" | "30d" | "90d"
type Inactive = "all" | "30d" | "60d" | "90d" | "never"
type SortField = "joined" | "last_signin" | "sessions" | "streak" | "last_session"
type SortDir = "asc" | "desc"

type Filters = {
  q: string
  role: Role
  tier: Tier
  status: Status
  joined: Joined
  inactive: Inactive
  sort: SortField
  dir: SortDir
  page: number
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>
): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const role = get("role")
  const tier = get("tier")
  const status = get("status")
  const joined = get("joined")
  const inactive = get("inactive")
  const sort = get("sort")
  const dir = get("dir")
  const pageRaw = Number(get("page") ?? 1)
  return {
    q: (get("q") ?? "").trim(),
    role:
      role === "user" || role === "admin" || role === "superadmin"
        ? role
        : "all",
    tier:
      tier === "free" ||
      tier === "freemium" ||
      tier === "basic" ||
      tier === "pro" ||
      tier === "enterprise" ||
      tier === "team"
        ? tier
        : "all",
    status: status === "active" || status === "suspended" ? status : "all",
    joined:
      joined === "7d" || joined === "30d" || joined === "90d" ? joined : "all",
    inactive:
      inactive === "30d" ||
      inactive === "60d" ||
      inactive === "90d" ||
      inactive === "never"
        ? inactive
        : "all",
    sort:
      sort === "last_signin" ||
      sort === "sessions" ||
      sort === "streak" ||
      sort === "last_session"
        ? sort
        : "joined",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  }
}

function joinedSinceIso(joined: Joined): string | null {
  if (joined === "all") return null
  const days = joined === "7d" ? 7 : joined === "30d" ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function inactiveCutoffIso(inactive: Inactive): string | null {
  if (inactive === "all" || inactive === "never") return null
  const days = inactive === "30d" ? 30 : inactive === "60d" ? 60 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

const SORT_COLUMN: Record<SortField, string> = {
  joined: "auth_created_at",
  last_signin: "last_sign_in_at",
  sessions: "total_sessions",
  streak: "streak_days",
  last_session: "last_session_at",
}

async function loadUsers(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("admin_users_overview")
    .select("*", { count: "exact" })
    .order(SORT_COLUMN[filters.sort], {
      ascending: filters.dir === "asc",
      // Push nulls last regardless of direction — admins almost always
      // want them out of the way (especially for last_signin sort).
      nullsFirst: false,
    })
    .range(from, to)

  if (filters.role !== "all") query = query.eq("role", filters.role)
  if (filters.tier !== "all") query = query.eq("subscription_tier", filters.tier)
  if (filters.status === "active") query = query.eq("disabled", false)
  if (filters.status === "suspended") query = query.eq("disabled", true)

  const joinedSince = joinedSinceIso(filters.joined)
  if (joinedSince) query = query.gte("auth_created_at", joinedSince)

  if (filters.inactive === "never") {
    query = query.is("last_sign_in_at", null)
  } else {
    const cutoff = inactiveCutoffIso(filters.inactive)
    if (cutoff) query = query.lt("last_sign_in_at", cutoff)
  }

  if (filters.q) {
    query = query.or(
      `email.ilike.%${filters.q}%,display_name.ilike.%${filters.q}%`
    )
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as UserRow[], total: count ?? 0 }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const filters = parseFilters(sp)
  const { rows, total } = await loadUsers(filters)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1
  const end = Math.min(filters.page * PAGE_SIZE, total)

  // Plain string map for the sort-header URL builder (drop arrays/undefined).
  const flatSp: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") flatSp[k] = v
    else if (Array.isArray(v)) flatSp[k] = v[0]
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="People with accounts on Dialectica."
      />

      <UsersFilterBar
        initialQ={filters.q}
        initialRole={filters.role}
        initialTier={filters.tier}
        initialStatus={filters.status}
        initialJoined={filters.joined}
        initialInactive={filters.inactive}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role · Tier</TableHead>
              <TableHead className="text-right">
                <SortHeader
                  field="sessions"
                  currentSort={filters.sort}
                  currentDir={filters.dir}
                  searchParams={flatSp}
                  align="right"
                >
                  Sessions
                </SortHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortHeader
                  field="streak"
                  currentSort={filters.sort}
                  currentDir={filters.dir}
                  searchParams={flatSp}
                  align="right"
                >
                  Streak
                </SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader
                  field="last_signin"
                  currentSort={filters.sort}
                  currentDir={filters.dir}
                  searchParams={flatSp}
                >
                  Last sign-in
                </SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader
                  field="joined"
                  currentSort={filters.sort}
                  currentDir={filters.dir}
                  searchParams={flatSp}
                >
                  Joined
                </SortHeader>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No users match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id ?? ""} className="group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {u.display_name || "—"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {u.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <RoleBadge role={u.role} />
                      <TierBadge tier={u.subscription_tier} />
                      {u.disabled ? (
                        <Badge
                          variant="outline"
                          className="border-red-500/40 bg-red-500/10 text-[10px] text-red-700 dark:text-red-400"
                        >
                          suspended
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.total_sessions ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.streak_days ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelative(u.last_sign_in_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelative(u.auth_created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/users/${u.id}`} />}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pager filters={filters} pageCount={pageCount} start={start} end={end} total={total} />
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  if (role === "superadmin") return <Badge>superadmin</Badge>
  if (role === "admin") return <Badge variant="secondary">admin</Badge>
  return <span className="text-muted-foreground text-xs">user</span>
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier || tier === "free")
    return <span className="text-muted-foreground text-[10px]">{tier ?? "free"}</span>
  const paid =
    tier === "pro" || tier === "enterprise" || tier === "team"
  return (
    <Badge
      variant="outline"
      className={
        paid
          ? "border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
          : "text-[10px]"
      }
    >
      {tier}
    </Badge>
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
    if (filters.role !== "all") sp.set("role", filters.role)
    if (filters.tier !== "all") sp.set("tier", filters.tier)
    if (filters.status !== "all") sp.set("status", filters.status)
    if (filters.joined !== "all") sp.set("joined", filters.joined)
    if (filters.inactive !== "all") sp.set("inactive", filters.inactive)
    if (filters.sort !== "joined") sp.set("sort", filters.sort)
    if (filters.dir !== "desc") sp.set("dir", filters.dir)
    if (page !== 1) sp.set("page", String(page))
    const qs = sp.toString()
    return qs ? `/admin/users?${qs}` : "/admin/users"
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
