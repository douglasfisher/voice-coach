import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Click-to-sort table header. Pure server component — clicking the
 * link reloads the page with a new ?sort=field&dir=asc|desc.
 *
 * Cycle: not active → desc → asc → desc → ...
 */
export function SortHeader({
  field,
  currentSort,
  currentDir,
  searchParams,
  align = "left",
  children,
}: {
  field: string
  currentSort: string
  currentDir: "asc" | "desc"
  searchParams: Record<string, string | undefined>
  align?: "left" | "right"
  children: React.ReactNode
}) {
  const active = currentSort === field
  // Toggle direction if clicking the active column; else default to desc
  // (most useful for "highest sessions" / "newest" which is what an
  // admin typically wants first).
  const nextDir: "asc" | "desc" = active && currentDir === "desc" ? "asc" : "desc"

  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") sp.set(k, v)
  }
  // Default sort is recent_join + desc — only emit params when they
  // diverge so URLs stay clean.
  if (field !== "joined" || nextDir !== "desc") {
    sp.set("sort", field)
    sp.set("dir", nextDir)
  }
  const qs = sp.toString()
  const href = qs ? `/admin/users?${qs}` : "/admin/users"

  return (
    <Link
      href={href}
      className={cn(
        "hover:text-foreground inline-flex items-center gap-1 transition-colors",
        align === "right" && "flex-row-reverse",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span>{children}</span>
      {active ? (
        currentDir === "desc" ? (
          <ArrowDown className="size-3" />
        ) : (
          <ArrowUp className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </Link>
  )
}
