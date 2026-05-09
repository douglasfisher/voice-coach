import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

/**
 * Types matching the chat edge function's AITaskType enum
 * (supabase/functions/_shared/cost-calculator.ts). Web admin currently
 * uses these:
 *   - 'complete'         when the chat function records its own usage
 *                        (the proxy route doesn't double-record)
 *   - 'image_generation' for Runware draft + hi-res + crop spend
 */
export type AdminTaskType =
  | "image_generation"
  | "complete"
  | "scenario"

type UsageInsert = Database["public"]["Tables"]["ai_usage"]["Insert"]

/**
 * Record an AI usage row from a web admin route. Mirrors mobile's
 * recordAIUsage helper but lives in the admin app so we don't need to
 * round-trip through the chat edge function for non-Groq spend (image
 * generation, etc.).
 *
 * For image generation the cost comes from Runware's response (cents
 * provided directly). For chat-proxy spend the chat function records
 * usage server-side so the admin route doesn't double-count.
 *
 * Token columns are best-effort:
 *   - image_generation: prompt_tokens=0, completion_tokens=number of
 *     images returned (so a "tokens" axis still tells us volume).
 *   - chat-style: real Groq token counts when available.
 */
export async function recordAdminAiUsage(
  admin: SupabaseClient<Database>,
  params: {
    userId?: string | null
    personaId?: string | null
    model: string
    promptTokens?: number
    completionTokens?: number
    estimatedCostCents: number
    taskType: AdminTaskType
  }
): Promise<void> {
  const row: UsageInsert = {
    user_id: params.userId ?? null,
    conversation_id: null,
    persona_id: params.personaId ?? null,
    model: params.model,
    prompt_tokens: params.promptTokens ?? 0,
    completion_tokens: params.completionTokens ?? 0,
    total_tokens: (params.promptTokens ?? 0) + (params.completionTokens ?? 0),
    estimated_cost_cents: Math.max(
      0,
      Math.round(params.estimatedCostCents)
    ),
    task_type: params.taskType,
  }
  const { error } = await admin.from("ai_usage").insert(row)
  if (error) {
    // Never throw — usage tracking failures must not break the user
    // request. Log loudly so they're visible in Vercel logs.
    console.error("ai_usage insert failed", { error, row })
  }
}
