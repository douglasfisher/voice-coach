import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/admin/avatars/library/claim
 *
 * Marks an avatar_library row as used_by_persona_id. Called by the
 * pick-from-library modal after the persona form has applied the URL.
 * Idempotent — re-claiming with the same persona is a no-op.
 *
 * If the persona is later assigned a different avatar, the old library
 * row keeps its used_by_persona_id (semantic: "this row was used by X
 * at some point") so we don't lose lineage. Re-clearing on un-assign is
 * a separate path we don't expose yet.
 */
const bodySchema = z.object({
  avatarId: z.string().uuid(),
  personaId: z.string().uuid(),
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

  const admin = createSupabaseAdminClient()
  const { data: before } = await admin
    .from("avatar_library")
    .select("id, used_by_persona_id")
    .eq("id", parsed.data.avatarId)
    .maybeSingle()
  if (!before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // Already claimed by the same persona? No-op.
  if (before.used_by_persona_id === parsed.data.personaId) {
    return Response.json({ data: { id: parsed.data.avatarId } })
  }

  const { error } = await admin
    .from("avatar_library")
    .update({ used_by_persona_id: parsed.data.personaId })
    .eq("id", parsed.data.avatarId)
  if (error) {
    return Response.json(
      { error: "update_failed", message: error.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "avatar.claim",
    targetTable: "avatar_library",
    targetId: parsed.data.avatarId,
    diff: {
      before: { used_by_persona_id: before.used_by_persona_id },
      after: { used_by_persona_id: parsed.data.personaId },
    },
  })

  return Response.json({ data: { id: parsed.data.avatarId } })
}
