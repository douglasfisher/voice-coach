import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { aiComplete } from "@/lib/ai/complete"

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

/**
 * Generic admin proxy to the `chat` edge function's "complete" task.
 *
 * The persona-specific routes (/persona-details, /system-prompt, /section)
 * render their prompts from app_settings.ai_persona_generator and call
 * aiComplete() directly. This generic route is kept for any free-form
 * complete call from the admin UI.
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

  const result = await aiComplete({
    systemPrompt: parsed.data.systemPrompt,
    userPrompt: parsed.data.userPrompt,
    settings: parsed.data.settings,
  })
  if (!result.ok) {
    return Response.json(
      { error: result.error, message: result.message, detail: result.detail },
      { status: result.status }
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
        chars: result.content.length,
      },
    },
  })

  return Response.json({ data: { content: result.content } })
}
