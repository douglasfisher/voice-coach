import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const bodySchema = z.object({
  model_settings: z.object({
    temperature: z.number().min(0).max(2),
    max_completion_tokens: z.number().int().min(64).max(4096),
  }),
  details: z.object({
    system: z.string().trim().min(20).max(4000),
    user_template: z.string().trim().min(40).max(8000),
  }),
  system_prompt: z.object({
    system: z.string().trim().min(20).max(4000),
    user_template: z.string().trim().min(40).max(8000),
  }),
  sections: z.object({
    _system: z.string().trim().min(20).max(4000),
    identity: z.string().trim().min(40).max(8000),
    character_traits: z.string().trim().min(40).max(8000),
    roleplay_behavior: z.string().trim().min(40).max(8000),
    coaching_approach: z.string().trim().min(40).max(8000),
  }),
  persona_context_template: z.string().trim().min(40).max(4000),
})

/**
 * Update app_settings.ai_persona_generator. Mirror of avatar-composition's
 * PATCH route — admin-gated, audit-logged, replaces the JSONB value
 * wholesale (no merge) so removing a field is also possible.
 */
export async function PATCH(req: Request) {
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
  const { data: before } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "ai_persona_generator")
    .maybeSingle()

  const { error } = await admin
    .from("app_settings")
    .update({ value: parsed.data })
    .eq("key", "ai_persona_generator")
  if (error) {
    return Response.json(
      { error: "update_failed", message: error.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "ai_config.persona_generator.update",
    targetTable: "app_settings",
    targetId: "ai_persona_generator",
    diff: {
      before: before?.value ?? null,
      after: parsed.data,
    },
  })

  return Response.json({ data: parsed.data })
}
