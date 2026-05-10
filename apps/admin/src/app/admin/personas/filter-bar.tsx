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

type PersonaType = "all" | "coach" | "challenger" | "advisor"
type DomainId = string | "all"
type Status = "all" | "active" | "inactive"

/**
 * Live filter bar for /admin/personas. Same pattern as
 * /admin/conversations and /admin/users: search debounced 250ms,
 * selects push the URL immediately, page param dropped on every
 * change so a filter doesn't strand the admin on page 4.
 *
 * `view` and `theme` segment params are preserved untouched — they're
 * controlled by the segmented buttons in the page header, not here.
 */
export function PersonasFilterBar({
  initialQ,
  initialType,
  initialDomain,
  initialStatus,
  domainOptions,
}: {
  initialQ: string
  initialType: PersonaType
  initialDomain: DomainId
  initialStatus: Status
  domainOptions: { id: string; name: string }[]
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
      type: PersonaType
      domain: DomainId
      status: Status
    }>) => {
      const sp = new URLSearchParams(params?.toString() ?? "")
      sp.delete("page")

      const nextQ = next.q ?? q
      const nextType = next.type ?? initialType
      const nextDomain = next.domain ?? initialDomain
      const nextStatus = next.status ?? initialStatus

      if (nextQ) sp.set("q", nextQ)
      else sp.delete("q")
      if (nextType !== "all") sp.set("type", nextType)
      else sp.delete("type")
      if (nextDomain !== "all") sp.set("domain", nextDomain)
      else sp.delete("domain")
      // Default is "active" (not "all") on this page — only emit when divergent.
      if (nextStatus !== "active") sp.set("status", nextStatus)
      else sp.delete("status")

      const qs = sp.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      navTransition(() => router.replace(href, { scroll: false }))
    },
    [params, pathname, router, navTransition, q, initialType, initialDomain, initialStatus]
  )

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
          placeholder="Search by name…"
          className="pl-8"
        />
      </div>
      <Select
        value={initialType}
        onValueChange={(v) => pushFilters({ type: v as PersonaType })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="coach">Coach</SelectItem>
          <SelectItem value="challenger">Challenger</SelectItem>
          <SelectItem value="advisor">Advisor</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={initialDomain}
        onValueChange={(v) => pushFilters({ domain: v as DomainId })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All domains</SelectItem>
          {domainOptions.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={initialStatus}
        onValueChange={(v) => pushFilters({ status: v as Status })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="all">Show all</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
