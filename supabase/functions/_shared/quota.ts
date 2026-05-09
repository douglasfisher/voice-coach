/**
 * Per-user daily token quota enforcement.
 *
 * Runs once per AI request in the chat edge function. Reads the user's
 * tier from user_profiles and the tier's daily limit from
 * app_settings.ai_tier_limits, sums their last 24h ai_usage tokens, and
 * returns whether they're over.
 *
 * Tiers with `enforce=false` (enterprise, team) are tracked but never
 * blocked — those plans are negotiated and we'd rather warn than 429
 * during a live demo.
 *
 * Anonymous calls (no userId) bypass the check entirely — chat function
 * still records the row, but admin-initiated complete() calls aren't
 * counted against any user's quota.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type QuotaResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'over_limit';
      tier: string;
      limit: number;
      used: number;
    };

type TierLimits = Record<
  string,
  { daily_tokens: number; enforce: boolean }
>;

const FALLBACK_LIMITS: TierLimits = {
  free: { daily_tokens: 10000, enforce: true },
  freemium: { daily_tokens: 50000, enforce: true },
  basic: { daily_tokens: 200000, enforce: true },
  pro: { daily_tokens: 1000000, enforce: true },
  enterprise: { daily_tokens: 5000000, enforce: false },
  team: { daily_tokens: 5000000, enforce: false },
};

export async function checkDailyQuota(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<QuotaResult> {
  if (!userId) return { ok: true };

  // Run profile + limits + usage sum in parallel.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [profileQ, limitsQ, usageQ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_tier_limits')
      .maybeSingle(),
    supabase
      .from('ai_usage')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', since),
  ]);

  const tier =
    (profileQ.data?.subscription_tier as string | undefined) ?? 'free';

  const limitsRaw =
    (limitsQ.data?.value as TierLimits | undefined) ?? FALLBACK_LIMITS;
  const limit = limitsRaw[tier] ?? FALLBACK_LIMITS[tier] ?? FALLBACK_LIMITS.free;

  // No data means this user has zero usage in the last 24h.
  const used = (usageQ.data ?? []).reduce(
    (sum, row) => sum + (row.total_tokens ?? 0),
    0,
  );

  if (limit.enforce && used >= limit.daily_tokens) {
    return {
      ok: false,
      reason: 'over_limit',
      tier,
      limit: limit.daily_tokens,
      used,
    };
  }
  return { ok: true };
}

/** Standard 429 response body so clients can show a tier-specific message. */
export function quotaExceededResponse(
  reason: Exclude<QuotaResult, { ok: true }>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: 'daily_token_limit_exceeded',
      tier: reason.tier,
      limit: reason.limit,
      used: reason.used,
      message: `Daily token limit reached for tier '${reason.tier}'. Used ${reason.used.toLocaleString()} of ${reason.limit.toLocaleString()}. Resets in 24 hours from your earliest call.`,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
