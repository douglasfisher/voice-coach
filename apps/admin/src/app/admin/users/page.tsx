import Link from "next/link"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
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
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatRelative } from "@/lib/format"
import type { Database } from "@/types/database"

export const metadata = { title: "Users · Dialectica Admin" }

const PAGE_SIZE = 25

type UserRow = Database["public"]["Views"]["admin_users_overview"]["Row"]

type Filters = {
  q: string
  role: "all" | "user" | "admin" | "superadmin"
  page: number
}

function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const get = (k: string) =>
    Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined)
  const role = get("role")
  const pageRaw = Number(get("page") ?? 1)
  return {
    q: (get("q") ?? "").trim(),
    role:
      role === "user" || role === "admin" || role === "superadmin"
        ? role
        : "all",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  }
}

async function loadUsers(filters: Filters) {
  const supabase = await createSupabaseServerClient()
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("admin_users_overview")
    .select("*", { count: "exact" })
    .order("auth_created_at", { ascending: false })
    .range(from, to)

  if (filters.role !== "all") {
    query = query.eq("role", filters.role)
  }
  if (filters.q) {
    // OR across email + display_name, case-insensitive contains.
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

  return (
    <div>
      <PageHeader
        title="Users"
        description="People with accounts on Dialectica."
      />

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Search email or display name…"
            className="pl-8"
          />
        </div>
        <Select name="role" defaultValue={filters.role}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
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
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
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
  return (
    <span className="text-muted-foreground text-xs">user</span>
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
