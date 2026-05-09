import Link from "next/link"
import {
  Brain,
  Eye,
  Heart,
  Scale,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CardTheme = "styled" | "neutral"

/**
 * Theme per challenge_style — gradient that fades into a tinted dark colour
 * at the bottom, an accent colour for the icon chip + style label, and the
 * Lucide icon to use. Mirrors the mobile PersonaCard's STYLE_THEMES map.
 */
type Theme = { gradient: string; accent: string; Icon: LucideIcon }

const STYLE_THEMES: Record<string, Theme> = {
  steelman: {
    gradient: "from-transparent via-[rgba(16,52,96,0.55)] to-[#0f3460]",
    accent: "#4ade80",
    Icon: Scale,
  },
  devils_advocate: {
    gradient: "from-transparent via-[rgba(74,25,66,0.55)] to-[#4a1942]",
    accent: "#f472b6",
    Icon: Zap,
  },
  socratic: {
    gradient: "from-transparent via-[rgba(30,58,95,0.55)] to-[#1e3a5f]",
    accent: "#60a5fa",
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: "from-transparent via-[rgba(61,53,32,0.55)] to-[#3d3520]",
    accent: "#fbbf24",
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: "from-transparent via-[rgba(13,68,68,0.55)] to-[#0d4444]",
    accent: "#2dd4bf",
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: "from-transparent via-[rgba(76,29,76,0.55)] to-[#4c1d4c]",
    accent: "#c084fc",
    Icon: Eye,
  },
}

const NEUTRAL_FALLBACK: Theme = {
  gradient: "from-transparent via-black/40 to-black/85",
  accent: "#ffffff",
  Icon: Sparkles,
}

/**
 * Neutral gradient that only fades in over the bottom ~45% of the card.
 * Implemented as an inline style so we can position the colour stops
 * exactly — Tailwind utility classes can express the colours but not
 * arbitrary stop positions cleanly.
 */
const NEUTRAL_GRADIENT_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.92) 100%)",
}

const TYPE_LABELS: Record<string, string> = {
  coach: "COACH",
  challenger: "CHALLENGER",
  advisor: "ADVISOR",
}

const TYPE_BADGE_TINT: Record<string, string> = {
  coach: "bg-emerald-500/85 text-emerald-950",
  challenger: "bg-rose-500/85 text-rose-950",
  advisor: "bg-violet-500/85 text-violet-50",
}

const CHALLENGE_STYLE_LABELS: Record<string, string> = {
  steelman: "The Steelman Builder",
  devils_advocate: "The Devil's Advocate",
  socratic: "The Socratic Questioner",
  empathetic_probe: "The Empathetic Probe",
  logical_surgeon: "The Logical Surgeon",
  perspective_shifter: "The Perspective Shifter",
}

export type PersonaCardData = {
  id: string
  name: string
  tagline: string | null
  persona_type: string | null
  challenge_style: string | null
  is_active: boolean | null
  is_premium: boolean | null
  avatar_url: string | null
  avatar_thumbnail_url: string | null
  domain_name?: string | null
}

export function PersonaCard({
  persona,
  theme: themeMode = "styled",
}: {
  persona: PersonaCardData
  theme?: CardTheme
}) {
  // Style colour comes from challenge_style. In neutral mode we still use the
  // accent (for the icon chip + label) but the gradient is replaced.
  const styleTheme = persona.challenge_style
    ? (STYLE_THEMES[persona.challenge_style] ?? NEUTRAL_FALLBACK)
    : NEUTRAL_FALLBACK
  const StyleIcon = styleTheme.Icon
  const styleLabel = persona.challenge_style
    ? (CHALLENGE_STYLE_LABELS[persona.challenge_style] ??
      titleCase(persona.challenge_style))
    : titleCase(persona.persona_type ?? "")

  const typeKey = (persona.persona_type ?? "").toLowerCase()
  const typeLabel = TYPE_LABELS[typeKey]
  const typeTint = TYPE_BADGE_TINT[typeKey] ?? "bg-white/85 text-black"

  const src =
    pickRemote(persona.avatar_thumbnail_url) ?? pickRemote(persona.avatar_url)
  const initials = deriveInitials(persona.name)

  return (
    <Link
      href={`/admin/personas/${persona.id}`}
      className={cn(
        "group relative block aspect-[3/4] overflow-hidden rounded-xl border bg-muted",
        "transition-transform duration-150 hover:scale-[1.015] hover:shadow-lg",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      )}
      aria-label={persona.name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={persona.name}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center text-3xl font-semibold tracking-tight"
          style={initialsTint(persona.name)}
        >
          {initials}
        </div>
      )}

      {/* Gradient overlay */}
      {themeMode === "neutral" ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={NEUTRAL_GRADIENT_STYLE}
        />
      ) : (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-b",
            styleTheme.gradient
          )}
        />
      )}

      {/* Top-left: type pill */}
      {typeLabel ? (
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-sm",
              typeTint
            )}
          >
            {typeLabel}
          </span>
        </div>
      ) : null}

      {/* Top-right badges */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        {persona.is_premium ? (
          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
            Premium
          </Badge>
        ) : null}
        {!persona.is_active ? (
          <Badge variant="secondary" className="bg-black/60 text-white">
            Inactive
          </Badge>
        ) : null}
      </div>

      {/* Bottom content */}
      <div className="absolute right-0 bottom-0 left-0 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-full"
            style={{ backgroundColor: styleTheme.accent }}
          >
            <StyleIcon className="size-3.5 text-black/85" strokeWidth={2.5} />
          </span>
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: styleTheme.accent }}
          >
            {styleLabel}
          </span>
        </div>
        <div className="text-lg leading-tight font-bold text-white drop-shadow-md">
          {persona.name}
        </div>
        {persona.tagline ? (
          <div className="mt-1 line-clamp-2 text-xs text-white/85 drop-shadow">
            {persona.tagline}
          </div>
        ) : null}
        {persona.domain_name ? (
          <div className="mt-2">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase backdrop-blur">
              {persona.domain_name}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

function pickRemote(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return null
}

function deriveInitials(name: string): string {
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

function initialsTint(seed: string): React.CSSProperties {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const hue = h % 360
  return {
    backgroundColor: `hsl(${hue} 60% 70%)`,
    color: `hsl(${hue} 50% 18%)`,
  }
}

function titleCase(s: string): string {
  if (!s) return ""
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
