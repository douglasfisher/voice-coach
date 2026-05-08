import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  systemPrompt: z.string().min(1).max(8000),
  userPrompt: z.string().min(1).max(20000),
  // Optional metadata for audit; the server never trusts this for routing.
  context: z
    .object({
      kind: z.string().optional(),
      personaId: z.string().uuid().optional(),
      sectionKey: z.string().optional(),
    })
    .optional(),
  settings: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      max_completion_tokens: z.number().int().min(64).max(4096).optional(),
    })
    .optional(),
})

const DEFAULT_SETTINGS = { temperature: 0.9, max_completion_tokens: 1024 }

/**
 * Generic admin proxy to the `chat` edge function's "complete" task.
 *
 * Re-uses the existing cost-tracked, model-resolved chat function the
 * mobile app already uses. Auditing happens here, not in the edge fn.
 */
export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.functions.invoke("chat", {
    body: {
      action: "complete",
      systemPrompt: parsed.data.systemPrompt,
      userPrompt: parsed.data.userPrompt,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.data.settings ?? {}) },
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
    return Response.json(
      { error: "chat_failed", message: error.message, detail },
      { status: 502 }
    )
  }

  const content = (data as { content?: string } | undefined)?.content ?? ""
  if (!content) {
    return Response.json(
      { error: "empty_response" },
      { status: 502 }
    )
  }

  await audit(gate.ctx, {
    action: "ai.complete",
    targetTable: parsed.data.context?.personaId ? "personas" : undefined,
    targetId: parsed.data.context?.personaId ?? null,
    diff: {
      before: null,
      after: {
        kind: parsed.data.context?.kind ?? "complete",
        section_key: parsed.data.context?.sectionKey ?? null,
        chars: content.length,
      },
    },
  })

  return Response.json({ data: { content } })
}
