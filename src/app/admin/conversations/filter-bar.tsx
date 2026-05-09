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

type Status = "all" | "active" | "ended"
type Range = "7d" | "30d" | "90d" | "all"

/**
 * Live filter bar for the conversations list. Replaces the old form +
 * Apply button: typing into the search box debounces a URL push so the
 * server re-queries automatically, and the selects push immediately.
 *
 * Selects are driven directly by the URL via props — no local state —
 * so browser back/forward stay perfectly in sync. The search input
 * keeps a small local state because we need to debounce keystrokes,
 * which is a transient cost the user already expects.
 *
 * `page` is dropped on every change so a filter doesn't strand the
 * admin on page 4 of an empty result set.
 */
export function ConversationsFilterBar({
  initialQ,
  initialStatus,
  initialRange,
}: {
  initialQ: string
  initialStatus: Status
  initialRange: Range
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, navTransition] = useTransition()

  const [q, setQ] = useState(initialQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushFilters = useCallback(
    (next: { q?: string; status?: Status; range?: Range }) => {
      const sp = new URLSearchParams(params?.toString() ?? "")
      sp.delete("page")

      const nextQ = next.q ?? q
      const nextStatus = next.status ?? initialStatus
      const nextRange = next.range ?? initialRange

      if (nextQ) sp.set("q", nextQ)
      else sp.delete("q")
      if (nextStatus !== "all") sp.set("status", nextStatus)
      else sp.delete("status")
      if (nextRange !== "all") sp.set("range", nextRange)
      else sp.delete("range")

      const qs = sp.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      navTransition(() => router.replace(href, { scroll: false }))
    },
    [params, pathname, router, navTransition, q, initialStatus, initialRange]
  )

  // Debounce text input only — selects push immediately on change.
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
          placeholder="Search title or paste partial id…"
          className="pl-8"
        />
      </div>
      <Select
        value={initialStatus}
        onValueChange={(v) => pushFilters({ status: v as Status })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="ended">Ended</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialRange}
        onValueChange={(v) => pushFilters({ range: v as Range })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
