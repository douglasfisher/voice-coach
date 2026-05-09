import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export type AiCompleteSettings = {
  temperature?: number
  max_completion_tokens?: number
}

export type AiCompleteResult =
  | { ok: true; content: string }
  | { ok: false; status: number; error: string; message?: string; detail?: string }

const DEFAULTS: Required<AiCompleteSettings> = {
  temperature: 0.9,
  max_completion_tokens: 1024,
}

/**
 * Shared helper that proxies into the existing `chat` edge function with
 * `action: 'complete'`. Used by every admin AI route — the per-section
 * AI write, the persona-details JSON generation, the system-prompt
 * generation, and any future free-form complete call.
 *
 * Errors are normalised: callers get a typed result without having to
 * hand-roll Supabase Function error parsing.
 */
export async function aiComplete({
  systemPrompt,
  userPrompt,
  settings,
}: {
  systemPrompt: string
  userPrompt: string
  settings?: AiCompleteSettings
}): Promise<AiCompleteResult> {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.functions.invoke("chat", {
    body: {
      action: "complete",
      systemPrompt,
      userPrompt,
      settings: { ...DEFAULTS, ...(settings ?? {}) },
    },
  })

  if (error) {
    let detail: string | undefined
    try {
      const ctx = (error as { context?: { text?: () => Promise<string> } })
        .context
      detail = await ctx?.text?.()
    } catch {
      // ignore
    }
    return {
      ok: false,
      status: 502,
      error: "chat_failed",
      message: error.message,
      detail,
    }
  }

  const content = (data as { content?: string } | undefined)?.content ?? ""
  if (!content) {
    return {
      ok: false,
      status: 502,
      error: "empty_response",
      message: "chat function returned no content",
    }
  }

  return { ok: true, content }
}
