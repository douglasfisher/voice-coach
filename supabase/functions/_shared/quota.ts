/**
 * Per-user daily token quota enforcement.
 *
 * Runs once per AI request in the chat edge function. Reads the user's
 * tier from user_profiles and the daily_tokens feature value from the
 * tier_features matrix (resolved via _shared/features.ts).
 *
 * `null` daily_tokens = unlimited — used for enterprise/team where we
 * track usage but never block. Other tiers all have a numeric cap.
 *
 * Anonymous calls (no userId) bypass the check entirely — chat function
 * still records the row, but admin-initiated complete() calls aren't
 * counted against any user's quota.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getQuota } from './features.ts';

export type QuotaResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'over_limit';
      tier: string;
      limit: number;
      used: number;
    };

export async function checkDailyQuota(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<QuotaResult> {
  if (!userId) return { ok: true };

  // Run profile + usage sum in parallel; the feature-resolver call
  // hits its own cache so it's effectively free after the first
  // request per minute.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [profileQ, usageQ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('ai_usage')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', since),
  ]);

  const tier =
    (profileQ.data?.subscription_tier as string | undefined) ?? 'free';

  const limit = await getQuota(supabase, tier, 'daily_tokens');

  // null = unlimited (enterprise/team or admin-tweaked). Track but
  // don't enforce.
  if (limit === null) return { ok: true };

  // Defensive: getQuota returns Infinity if the catalogue key is
  // missing entirely. Treat that as "no enforcement" too.
  if (!Number.isFinite(limit)) return { ok: true };

  const used = (usageQ.data ?? []).reduce(
    (sum, row) => sum + (row.total_tokens ?? 0),
    0,
  );

  if (used >= limit) {
    return {
      ok: false,
      reason: 'over_limit',
      tier,
      limit,
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
