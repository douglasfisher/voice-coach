"use client"

import { useRouter } from "next/navigation"
import { useCallback, type MouseEvent, type ReactNode } from "react"

import { TableRow } from "@/components/ui/table"

/**
 * Row-as-link wrapper. Replaces the "absolute Link inset-0 + z-index"
 * trick which was getting overlaid by cells that need their own
 * `relative` positioning. Clicks anywhere on the row navigate; clicks
 * on inner anchors / buttons still take their own action because the
 * default-prevent check skips when the click already had a closer
 * link/button target.
 */
export function ConversationRowLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const router = useRouter()
  const handleClick = useCallback(
    (e: MouseEvent<HTMLTableRowElement>) => {
      // Honour modifier keys for "open in new tab" workflows.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      // If the click landed on (or inside) an anchor or button, let
      // that element handle it instead — typical for inline links.
      const target = e.target as HTMLElement | null
      if (target && target.closest("a, button")) return
      router.push(href)
    },
    [href, router]
  )

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={handleClick}
    >
      {children}
    </TableRow>
  )
}
