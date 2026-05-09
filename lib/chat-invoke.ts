import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type QuotaExceeded = {
  kind: 'quota_exceeded';
  tier: string;
  limit: number;
  used: number;
  message: string;
};

export class QuotaExceededError extends Error {
  readonly kind = 'quota_exceeded' as const;
  readonly tier: string;
  readonly limit: number;
  readonly used: number;
  constructor(detail: QuotaExceeded) {
    super(detail.message);
    this.name = 'QuotaExceededError';
    this.tier = detail.tier;
    this.limit = detail.limit;
    this.used = detail.used;
  }
}

/**
 * Wrapper around `supabase.functions.invoke('chat', …)` that translates
 * the chat fn's quota 429 response into a typed `QuotaExceededError`.
 *
 * supabase-js v2 surfaces non-2xx responses as `FunctionsHttpError`. The
 * original `Response` is on `error.context`, so we can read its body and
 * promote a known `error: 'daily_token_limit_exceeded'` payload into a
 * structured error the UI can render with an upgrade CTA. All other
 * errors pass through unchanged so existing call sites still see them.
 */
export async function invokeChatFunction<TData = unknown>(
  options: { body: Record<string, unknown> },
): Promise<{ data: TData | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke<TData>('chat', {
    body: options.body,
  });

  if (!error) return { data: (data ?? null) as TData | null, error: null };

  if (error instanceof FunctionsHttpError) {
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && ctx.status === 429) {
      try {
        const payload = (await ctx.clone().json()) as Partial<QuotaExceeded> & {
          error?: string;
        };
        if (payload.error === 'daily_token_limit_exceeded') {
          return {
            data: null,
            error: new QuotaExceededError({
              kind: 'quota_exceeded',
              tier: payload.tier ?? 'free',
              limit: payload.limit ?? 0,
              used: payload.used ?? 0,
              message:
                payload.message ?? 'Daily AI usage limit reached.',
            }),
          };
        }
      } catch {
        // fall through — return the raw error
      }
    }
  }

  return { data: null, error };
}

export function isQuotaError(err: unknown): err is QuotaExceededError {
  return err instanceof QuotaExceededError;
}
