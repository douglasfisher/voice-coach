import DOMPurify from "isomorphic-dompurify"

import { cn } from "@/lib/utils"

/**
 * Renders the configured silhouette SVG as a transparent overlay above an
 * image. The SVG is admin-authored (write-gated via requireAdminApi on the
 * composition PATCH route) but we still sanitise at render time as
 * defense-in-depth — DOMPurify strips event handlers and external refs so
 * even a compromised admin row can't inject script.
 *
 * Stroke colour uses currentColor; the surrounding `text-…` class controls
 * the visible colour so it adapts to dark/light theme.
 */
export function CompositionOverlay({
  svg,
  className,
  opacity = 0.35,
}: {
  svg: string
  className?: string
  opacity?: number
}) {
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  })
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 text-white [&>svg]:size-full",
        className
      )}
      style={{ opacity }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
