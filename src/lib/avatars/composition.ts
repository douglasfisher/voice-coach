import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Avatar composition target — the SVG silhouette + safe-zone percentages
 * that drive the framing overlay shown on draft previews and inside the
 * crop modal. Source of truth lives in app_settings.ai_avatar_composition.
 */
export type AvatarSafeZone = {
  head_top_pct: number
  head_height_pct: number
  shoulders_top_pct: number
  shoulders_height_pct: number
  horizontal_center_pct: number
  head_width_pct: number
}

export type AvatarComposition = {
  targetAspect: string // e.g. "3:4"
  safeZone: AvatarSafeZone
  silhouetteSvg: string
}

const FALLBACK_SAFE_ZONE: AvatarSafeZone = {
  head_top_pct: 12,
  head_height_pct: 32,
  shoulders_top_pct: 44,
  shoulders_height_pct: 56,
  horizontal_center_pct: 50,
  head_width_pct: 28,
}

const FALLBACK_SVG = `<svg viewBox="0 0 100 133.33" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="0.6"><ellipse cx="50" cy="33" rx="14" ry="20"/><path d="M 22 95 C 22 75, 35 60, 50 60 C 65 60, 78 75, 78 95 L 78 133 L 22 133 Z"/></svg>`

const FALLBACK: AvatarComposition = {
  targetAspect: "3:4",
  safeZone: FALLBACK_SAFE_ZONE,
  silhouetteSvg: FALLBACK_SVG,
}

function readNumber(v: unknown, fb: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fb
}

function readSafeZone(raw: unknown): AvatarSafeZone {
  if (!raw || typeof raw !== "object") return FALLBACK_SAFE_ZONE
  const v = raw as Record<string, unknown>
  return {
    head_top_pct: readNumber(v.head_top_pct, FALLBACK_SAFE_ZONE.head_top_pct),
    head_height_pct: readNumber(
      v.head_height_pct,
      FALLBACK_SAFE_ZONE.head_height_pct
    ),
    shoulders_top_pct: readNumber(
      v.shoulders_top_pct,
      FALLBACK_SAFE_ZONE.shoulders_top_pct
    ),
    shoulders_height_pct: readNumber(
      v.shoulders_height_pct,
      FALLBACK_SAFE_ZONE.shoulders_height_pct
    ),
    horizontal_center_pct: readNumber(
      v.horizontal_center_pct,
      FALLBACK_SAFE_ZONE.horizontal_center_pct
    ),
    head_width_pct: readNumber(
      v.head_width_pct,
      FALLBACK_SAFE_ZONE.head_width_pct
    ),
  }
}

/**
 * Read app_settings.ai_avatar_composition. Server-only — pages call this
 * directly. Fallback values match migration 076 so the app keeps rendering
 * even if the row is missing.
 */
export async function loadAvatarComposition(): Promise<AvatarComposition> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_avatar_composition")
    .maybeSingle()

  if (!data?.value || typeof data.value !== "object") return FALLBACK
  const v = data.value as Record<string, unknown>
  return {
    targetAspect:
      typeof v.target_aspect === "string"
        ? v.target_aspect
        : FALLBACK.targetAspect,
    safeZone: readSafeZone(v.safe_zone),
    silhouetteSvg:
      typeof v.silhouette_svg === "string" && v.silhouette_svg.trim()
        ? v.silhouette_svg
        : FALLBACK.silhouetteSvg,
  }
}
