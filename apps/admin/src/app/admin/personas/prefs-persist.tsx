"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Per-device view-preference persistence for /admin/personas.
 *
 * The URL stays the source of truth — bookmarks, back-button navigation,
 * deep-link sharing all keep working. localStorage is just a memory
 * layer:
 *  - When the admin lands with NO query params, we restore their last
 *    saved view (filters + grid/table + styled/neutral).
 *  - When the admin lands with ANY tracked query param, we treat that
 *    as the new state and overwrite localStorage.
 *
 * `page` is intentionally excluded — paging is transient, not a view
 * preference. Coming back to the list shouldn't drop you on page 4 of
 * yesterday's filter.
 *
 * Renders nothing — purely a side-effect component.
 */
const STORAGE_KEY = "dialectica-admin-personas-prefs"
const TRACKED = ["q", "type", "domain", "status", "view", "theme"] as const

export function PersonaPrefsPersist() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    const hasAnyTracked = TRACKED.some((k) => params?.get(k))

    if (!hasAnyTracked) {
      // Restore from localStorage. Wrap everything in try/catch
      // because localStorage is unavailable in private browsing on
      // some browsers and Safari throws on reads in some cases.
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as Record<string, string>
        const sp = new URLSearchParams()
        for (const k of TRACKED) {
          const v = parsed[k]
          if (v) sp.set(k, v)
        }
        const qs = sp.toString()
        if (qs) {
          router.replace(`${pathname}?${qs}`, { scroll: false })
        }
      } catch {
        // ignore — fresh defaults are fine
      }
      return
    }

    // Save current params to localStorage so the next bare visit
    // restores them.
    try {
      const out: Record<string, string> = {}
      for (const k of TRACKED) {
        const v = params?.get(k)
        if (v) out[k] = v
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out))
    } catch {
      // ignore — best-effort persistence
    }
  }, [params, pathname, router])

  return null
}
