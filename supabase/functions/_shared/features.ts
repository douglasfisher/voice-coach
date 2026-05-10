/**
 * Feature resolver for edge functions.
 *
 * Loads the feature catalogue + every tier's overrides once, caches in
 * module memory for 60s, and resolves a tier's effective feature map
 * by walking the hierarchy free → freemium → basic → pro → enterprise →
 * team. Last-write-wins per key.
 *
 * The cache is bounded — at most ~30 features + ~50 overrides per
 * fetch — so this is much cheaper than per-key queries on hot paths
 * (chat, tts, runware all call into this).
 *
 * If you need to bust the cache from the admin UI after a matrix
 * edit, expose a header check or a row in app_settings that bumps a
 * version. For now, the 60s TTL is good enough — the matrix changes
 * rarely.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUBSCRIPTION_TIERS = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
] as const
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  freemium: 1,
  basic: 2,
  pro: 3,
  enterprise: 4,
  team: 5,
}

export type FeatureValue = boolean | number | null

interface FlagRow {
  key: string
  default_value: FeatureValue
  kind: "boolean" | "number"
}
interface OverrideRow {
  tier: SubscriptionTier
  feature_key: string
  value: FeatureValue
}

interface CachedSnapshot {
  flags: FlagRow[]
  /** overrides indexed by tier for fast hierarchy walks */
  overridesByTier: Map<SubscriptionTier, Map<string, FeatureValue>>
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
let cache: CachedSnapshot | null = null
let inflight: Promise<CachedSnapshot> | null = null

async function loadSnapshot(
  supabase: SupabaseClient,
): Promise<CachedSnapshot> {
  if (cache && cache.expiresAt > Date.now()) return cache
  if (inflight) return inflight

  inflight = (async () => {
    const [flagsRes, overridesRes] = await Promise.all([
      supabase.from("feature_flags").select("key, default_value, kind"),
      supabase.from("tier_features").select("tier, feature_key, value"),
    ])

    if (flagsRes.error) {
      console.error("[features] feature_flags load failed", flagsRes.error)
    }
    if (overridesRes.error) {
      console.error(
        "[features] tier_features load failed",
        overridesRes.error,
      )
    }

    const flags: FlagRow[] = (flagsRes.data ?? []) as FlagRow[]
    const rawOverrides: OverrideRow[] =
      (overridesRes.data ?? []) as OverrideRow[]

    const overridesByTier = new Map<
      SubscriptionTier,
      Map<string, FeatureValue>
    >()
    for (const tier of SUBSCRIPTION_TIERS) {
      overridesByTier.set(tier, new Map())
    }
    for (const ov of rawOverrides) {
      const m = overridesByTier.get(ov.tier)
      if (m) m.set(ov.feature_key, ov.value)
    }

    const snapshot: CachedSnapshot = {
      flags,
      overridesByTier,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
    cache = snapshot
    return snapshot
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Force a refresh on next call. Call from admin write paths if you
 * want lower-than-60s consistency, otherwise the TTL handles it. */
export function bustFeatureCache(): void {
  cache = null
}

/**
 * Resolve every feature for a given tier. Returns a Map keyed by
 * feature key. Numeric features may resolve to `null`, which means
 * "unlimited" — callers should treat null as "no cap".
 */
export async function resolveFeaturesForTier(
  supabase: SupabaseClient,
  tier: SubscriptionTier | string | null | undefined,
): Promise<Map<string, FeatureValue>> {
  const safeTier: SubscriptionTier =
    tier && (tier as SubscriptionTier) in TIER_RANK
      ? (tier as SubscriptionTier)
      : "free"

  const snapshot = await loadSnapshot(supabase)
  const out = new Map<string, FeatureValue>()

  // 1. Start from catalogue defaults.
  for (const flag of snapshot.flags) {
    out.set(flag.key, flag.default_value)
  }

  // 2. Walk free → safeTier, applying overrides in order so the
  // higher tier wins.
  const userRank = TIER_RANK[safeTier]
  for (const t of SUBSCRIPTION_TIERS) {
    if (TIER_RANK[t] > userRank) break
    const overrides = snapshot.overridesByTier.get(t)
    if (!overrides) continue
    for (const [k, v] of overrides) {
      out.set(k, v)
    }
  }

  return out
}

/**
 * Convenience: is this boolean feature on for the given tier? Returns
 * false if the feature is missing from the catalogue (defensive).
 */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  tier: SubscriptionTier | string | null | undefined,
  key: string,
): Promise<boolean> {
  const features = await resolveFeaturesForTier(supabase, tier)
  return features.get(key) === true
}

/**
 * Convenience: numeric quota lookup. Returns the limit, or `null` for
 * "unlimited". Returns `Infinity` as a fallback if the feature is
 * missing from the catalogue (so callers don't accidentally lock out
 * usage on an unknown key).
 */
export async function getQuota(
  supabase: SupabaseClient,
  tier: SubscriptionTier | string | null | undefined,
  key: string,
): Promise<number | null> {
  const features = await resolveFeaturesForTier(supabase, tier)
  if (!features.has(key)) return Infinity
  const v = features.get(key)
  if (v === null) return null
  if (typeof v === "number") return v
  return Infinity
}
