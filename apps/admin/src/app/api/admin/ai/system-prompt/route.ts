import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { aiComplete } from "@/lib/ai/complete"
import { renderTemplate } from "@/lib/ai/render-prompt"
import { loadPersonaGeneratorConfig } from "@/lib/personas/generator-config"
import { buildContextVars } from "@/lib/personas/generator-context"

/**
 * POST /api/admin/ai/system-prompt
 *
 * Produces the full free-form system_prompt (200–400 words) for a persona
 * using the existing form values as context. Mobile parity: same template,
 * loaded from app_settings.ai_persona_generator.
 */

const formSnapshotSchema = z.object({
  name: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  cultural_background: z.string().nullable().optional(),
  persona_type: z.string().optional(),
  coaching_style: z.string().nullable().optional(),
  challenge_style: z.string().nullable().optional(),
  feedback_style: z.string().nullable().optional(),
  warmth: z.number().optional(),
  directness: z.number().optional(),
  patience: z.number().optional(),
  humor: z.number().optional(),
  formality: z.number().optional(),
  gender: z.string().optional(),
  age_range: z.string().nullable().optional(),
  avatar_params: z
    .object({
      params: z.object({
        gender: z.string(),
        age_range: z.string(),
        ethnicity: z.string(),
        appearance: z.string(),
        lighting: z.string(),
        clothing: z.string(),
        expression: z.string(),
        accessories: z.array(z.string()),
        pose: z.string(),
        camera: z.string(),
      }),
      prompt: z.string(),
    })
    .nullable()
    .optional(),
})

const bodySchema = z.object({
  form: formSnapshotSchema,
  context: z
    .object({ personaId: z.string().uuid().optional() })
    .optional(),
})

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

  const config = await loadPersonaGeneratorConfig()
  const vars = buildContextVars(parsed.data.form)
  const userPrompt = renderTemplate(config.systemPrompt.userTemplate, vars)

  const result = await aiComplete({
    systemPrompt: config.systemPrompt.system,
    userPrompt,
    settings: config.modelSettings,
  })
  if (!result.ok) {
    return Response.json(
      { error: result.error, message: result.message, detail: result.detail },
      { status: result.status }
    )
  }

  const content = result.content.trim()
  if (!content) {
    return Response.json(
      { error: "empty_response" },
      { status: 502 }
    )
  }

  await audit(gate.ctx, {
    action: "persona_generator.system_prompt",
    targetTable: parsed.data.context?.personaId ? "personas" : undefined,
    targetId: parsed.data.context?.personaId ?? null,
    diff: { before: null, after: { chars: content.length } },
  })

  return Response.json({ data: { content } })
}
