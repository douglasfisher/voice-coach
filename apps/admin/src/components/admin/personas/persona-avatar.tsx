"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Persona avatar tile.
 *
 *   - Default shape is portrait 3:4 (taller than wide), NOT circular —
 *     personas are head-and-shoulders portraits, not user identicons.
 *   - Resolution: real http(s) URL → use it (preferring thumbnail);
 *     anything else → colored initials fallback.
 *   - Lazy <img>; on load error we hide the broken image so the initials
 *     fallback shows through (the URL is still set, just visibly suppressed).
 *
 * The shadcn `Avatar` component is intentionally NOT used here — it's
 * hard-coded to rounded-full and forces aspect-square via its primitive
 * styles. This is the persona-specific equivalent.
 */
export function PersonaAvatar({
  name,
  url,
  thumbnailUrl,
  className,
}: {
  name: string | null | undefined
  url?: string | null
  thumbnailUrl?: string | null
  className?: string
}) {
  const src = pickRemote(thumbnailUrl) ?? pickRemote(url)
  const [errored, setErrored] = useState(false)
  const initials = deriveInitials(name)
  const tint = colorFor(name ?? "")

  return (
    <div
      className={cn(
        "bg-muted relative aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-md border",
        className
      )}
    >
      {/* Initials fill the box; the image overlays when present.
          When the image errors we leave the initials visible. */}
      <div
        className="absolute inset-0 grid place-items-center text-xs font-semibold tracking-tight"
        style={{ backgroundColor: tint.bg, color: tint.fg }}
      >
        {initials}
      </div>
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ""}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </div>
  )
}

function pickRemote(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return null
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const cleaned = name.replace(/^(Dr\.?|Prof\.?|Professor)\s+/i, "")
  return (
    cleaned
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?"
  )
}

function colorFor(seed: string): { bg: string; fg: string } {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const hue = h % 360
  return {
    bg: `hsl(${hue} 60% 92%)`,
    fg: `hsl(${hue} 50% 32%)`,
  }
}
