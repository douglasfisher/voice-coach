"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
type StreakWindow = "7" | "14" | "30"

/**
 * Live filter bar for /admin/users. Same pattern as
 * /admin/conversations: search debounced 250ms, selects push the URL
 * immediately, page param dropped on every change so a filter doesn't
 * strand the admin on page 4 of an empty result set.
 *
 * Selects are uncontrolled (driven by the `initial*` props from the
 * server-rendered page); the search input keeps tiny local state for
 * debouncing.
 */
export function UsersFilterBar({
  initialQ,
  initialRole,
  initialTier,
  initialStatus,
  initialJoined,
  initialInactive,
  initialWindow,
}: {
  initialQ: string
  initialRole: Role
  initialTier: Tier
  initialStatus: Status
  initialJoined: Joined
  initialInactive: Inactive
  initialWindow: StreakWindow
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, navTransition] = useTransition()

  const [q, setQ] = useState(initialQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushFilters = useCallback(
    (next: Partial<{
      q: string
      role: Role
      tier: Tier
      status: Status
      joined: Joined
      inactive: Inactive
      window: StreakWindow
    }>) => {
      const sp = new URLSearchParams(params?.toString() ?? "")
      sp.delete("page")

      const nextQ = next.q ?? q
      const nextRole = next.role ?? initialRole
      const nextTier = next.tier ?? initialTier
      const nextStatus = next.status ?? initialStatus
      const nextJoined = next.joined ?? initialJoined
      const nextInactive = next.inactive ?? initialInactive
      const nextWindow = next.window ?? initialWindow

      if (nextQ) sp.set("q", nextQ)
      else sp.delete("q")
      if (nextRole !== "all") sp.set("role", nextRole)
      else sp.delete("role")
      if (nextTier !== "all") sp.set("tier", nextTier)
      else sp.delete("tier")
      if (nextStatus !== "all") sp.set("status", nextStatus)
      else sp.delete("status")
      if (nextJoined !== "all") sp.set("joined", nextJoined)
      else sp.delete("joined")
      if (nextInactive !== "all") sp.set("inactive", nextInactive)
      else sp.delete("inactive")
      // Default 14d — only emit when divergent.
      if (nextWindow !== "14") sp.set("window", nextWindow)
      else sp.delete("window")

      const qs = sp.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      navTransition(() => router.replace(href, { scroll: false }))
    },
    [
      params,
      pathname,
      router,
      navTransition,
      q,
      initialRole,
      initialTier,
      initialStatus,
      initialJoined,
      initialInactive,
      initialWindow,
    ]
  )

  // Debounce the search input — selects push immediately on change.
  useEffect(() => {
    if (q === initialQ) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushFilters({ q })
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, initialQ, pushFilters])

  return (
    <div className="my-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-64 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or display name…"
          className="pl-8"
        />
      </div>
      <Select
        value={initialRole}
        onValueChange={(v) => pushFilters({ role: v as Role })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="superadmin">Superadmin</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialTier}
        onValueChange={(v) => pushFilters({ tier: v as Tier })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tiers</SelectItem>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="freemium">Freemium</SelectItem>
          <SelectItem value="basic">Basic</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
          <SelectItem value="team">Team</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialStatus}
        onValueChange={(v) => pushFilters({ status: v as Status })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialJoined}
        onValueChange={(v) => pushFilters({ joined: v as Joined })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Joined" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any time</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialInactive}
        onValueChange={(v) => pushFilters({ inactive: v as Inactive })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Inactivity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any activity</SelectItem>
          <SelectItem value="30d">Inactive 30+ days</SelectItem>
          <SelectItem value="60d">Inactive 60+ days</SelectItem>
          <SelectItem value="90d">Inactive 90+ days</SelectItem>
          <SelectItem value="never">Never signed in</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialWindow}
        onValueChange={(v) => pushFilters({ window: v as StreakWindow })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Streak" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Streak: 7d</SelectItem>
          <SelectItem value="14">Streak: 14d</SelectItem>
          <SelectItem value="30">Streak: 30d</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
