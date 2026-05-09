import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * PATCH /api/admin/ai-config/voice-defaults
 *
 * Saves the voice ID defaults used when creating personas. The previous
 * `all_default_ids` set is preserved across saves — this is what lets the
 * persona-editor's auto-fill effect distinguish "still on a default" from
 * "manually set", even when the per-gender defaults change later. Admin
 * can clear the history via the editor's UI explicitly.
 */
const bodySchema = z.object({
  provider: z.string().trim().min(1).max(40),
  by_gender: z.record(z.string().min(1), z.string().trim().min(1).max(120)),
  // Optional: when present, replaces all_default_ids wholesale. When
  // absent, server unions the new by_gender values with the previous set.
  reset_history: z.boolean().optional(),
})

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
    .eq("key", "ai_voice_defaults")
    .maybeSingle()

  const previousAll =
    Array.isArray(
      (before?.value as { all_default_ids?: unknown })?.all_default_ids
    )
      ? ((before?.value as { all_default_ids: unknown[] }).all_default_ids
          .filter((s): s is string => typeof s === "string"))
      : []

  const allDefaultIds = parsed.data.reset_history
    ? Object.values(parsed.data.by_gender)
    : Array.from(
        new Set([...previousAll, ...Object.values(parsed.data.by_gender)])
      )

  const next = {
    provider: parsed.data.provider,
    by_gender: parsed.data.by_gender,
    all_default_ids: allDefaultIds,
  }

  const { error } = await admin
    .from("app_settings")
    .update({ value: next })
    .eq("key", "ai_voice_defaults")
  if (error) {
    return Response.json(
      { error: "update_failed", message: error.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "ai_config.voice_defaults.update",
    targetTable: "app_settings",
    targetId: "ai_voice_defaults",
    diff: { before: before?.value ?? null, after: next },
  })

  return Response.json({ data: next })
}
