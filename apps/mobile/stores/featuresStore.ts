/**
 * Mobile-side resolved-features cache.
 *
 * Loads the feature catalogue + every tier's overrides from Supabase
 * once per "session bootstrap or tier change", resolves the user's
 * tier into an effective feature map, and exposes it via a hook.
 *
 * The matrix is small (≤ 200 rows) and isn't sensitive (mobile already
 * needs to know what's gated to render the upgrade-CTA UI), so we
 * fetch the whole thing rather than per-tier slicing on the server.
 *
 * Refreshed:
 *  - on the first useFeatures() call after login
 *  - when the user's tier changes (authStore.profile.subscription_tier)
 *  - on app foreground after >5 min idle (caller hooks AppState)
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  FEATURE_CATALOGUE,
  resolveFeatureValue,
  type FeatureDefinition,
  type SubscriptionTier,
} from '@dialectica/shared-types';

type FeatureValue = boolean | number | null

interface FeatureFlagRow {
  key: string;
  default_value: FeatureValue;
}
interface TierFeatureRow {
  tier: SubscriptionTier;
  feature_key: string;
  value: FeatureValue;
}

interface FeaturesState {
  /** The user's resolved feature map. Empty until the first load completes. */
  resolved: Record<string, FeatureValue>;
  /** Tier the resolved map was computed for (used to detect drift). */
  resolvedTier: SubscriptionTier | null;
  isLoading: boolean;
  lastFetchedAt: number;
  loadFor: (tier: SubscriptionTier | string | null | undefined) => Promise<void>;
  refresh: () => Promise<void>;
  /** Read the resolved value for a key, with the static catalogue
   *  default as a fallback when the matrix hasn't loaded yet. */
  get: (key: string) => FeatureValue;
}

const FRESH_TTL_MS = 5 * 60 * 1000;

function safeTier(tier: SubscriptionTier | string | null | undefined): SubscriptionTier {
  const allowed = ['free', 'freemium', 'basic', 'pro', 'enterprise', 'team'] as const;
  return (allowed as readonly string[]).includes(String(tier))
    ? (tier as SubscriptionTier)
    : 'free';
}

function catalogueDefault(key: string): FeatureValue {
  const def = FEATURE_CATALOGUE.find((f) => f.key === key);
  return (def?.default_value ?? null) as FeatureValue;
}

export const useFeaturesStore = create<FeaturesState>()((set, get) => ({
  resolved: {},
  resolvedTier: null,
  isLoading: false,
  lastFetchedAt: 0,

  loadFor: async (tierInput) => {
    const tier = safeTier(tierInput);
    const fresh = Date.now() - get().lastFetchedAt < FRESH_TTL_MS;
    // If the fetch is fresh and the tier hasn't changed, skip the round-trip.
    if (fresh && get().resolvedTier === tier) return;

    set({ isLoading: true });
    try {
      const [flagsRes, overridesRes] = await Promise.all([
        supabase.from('feature_flags').select('key, default_value'),
        supabase.from('tier_features').select('tier, feature_key, value'),
      ]);

      // Catalogue might be empty on first install or in offline mode;
      // fall back to the bundled TS catalogue.
      const flags: FeatureFlagRow[] =
        flagsRes.data && flagsRes.data.length > 0
          ? (flagsRes.data as FeatureFlagRow[])
          : FEATURE_CATALOGUE.map<FeatureFlagRow>((f: FeatureDefinition) => ({
              key: f.key,
              default_value: f.default_value,
            }));

      const overrides: TierFeatureRow[] =
        (overridesRes.data ?? []) as TierFeatureRow[];

      const overridesByTier = new Map<SubscriptionTier, Map<string, FeatureValue>>();
      for (const ov of overrides) {
        let m = overridesByTier.get(ov.tier);
        if (!m) {
          m = new Map();
          overridesByTier.set(ov.tier, m);
        }
        m.set(ov.feature_key, ov.value);
      }

      const resolved: Record<string, FeatureValue> = {};
      for (const flag of flags) {
        // Use the shared resolver so server + client agree on hierarchy
        // semantics. The resolver wants a FeatureDefinition; supply a
        // synthetic one — only `key` and `default_value` matter for
        // resolution.
        const def: FeatureDefinition = {
          key: flag.key,
          kind: typeof flag.default_value === 'boolean' ? 'boolean' : 'number',
          default_value: (flag.default_value ?? 0) as boolean | number,
          name: flag.key,
          description: '',
          group: 'Quotas',
          sort_order: 0,
        };
        resolved[flag.key] = resolveFeatureValue(def, tier, overridesByTier);
      }

      set({
        resolved,
        resolvedTier: tier,
        lastFetchedAt: Date.now(),
        isLoading: false,
      });
    } catch (err) {
      console.error('[features] load failed', err);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const tier = get().resolvedTier ?? 'free';
    set({ lastFetchedAt: 0 });
    await get().loadFor(tier);
  },

  get: (key) => {
    const r = get().resolved[key];
    if (r !== undefined) return r;
    return catalogueDefault(key);
  },
}));

/**
 * Convenience hooks for the two common access patterns.
 *
 * `useFeature('voice_output_enabled')` returns the resolved boolean.
 * `useQuota('daily_tokens')` returns the resolved number, or null
 *   (which the caller should treat as "no cap").
 *
 * Both fall back to the catalogue default if the matrix hasn't loaded
 * yet — better to under-permit briefly than to gate a free user out
 * of features they should have.
 */
export function useFeature(key: string): boolean {
  return useFeaturesStore((s) => {
    const v = s.resolved[key];
    if (typeof v === 'boolean') return v;
    if (v === undefined) {
      const cat = catalogueDefault(key);
      return cat === true;
    }
    return false;
  });
}

export function useQuota(key: string): number | null {
  return useFeaturesStore((s) => {
    const v = s.resolved[key];
    if (typeof v === 'number') return v;
    if (v === null) return null;
    if (v === undefined) {
      const cat = catalogueDefault(key);
      return typeof cat === 'number' ? cat : null;
    }
    return null;
  });
}
