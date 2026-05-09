import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const idParam = z.string().uuid()
const bodySchema = z.object({ is_active: z.boolean() })

/**
 * Single-field PATCH for the personas.is_active flag — used by the row
 * activate/deactivate icon. Avoids round-tripping the full persona schema
 * for a one-bool flip.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!idParam.safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "validation_failed" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: before, error: readErr } = await admin
    .from("personas")
    .select("id, name, is_active")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  if (before.is_active === parsed.data.is_active) {
    return Response.json({ data: before })
  }

  const { data: after, error: writeErr } = await admin
    .from("personas")
    .update({ is_active: parsed.data.is_active })
    .eq("id", id)
    .select("id, name, is_active")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: parsed.data.is_active
      ? "persona.activate"
      : "persona.deactivate",
    targetTable: "personas",
    targetId: id,
    diff: {
      before: { is_active: before.is_active },
      after: { is_active: after.is_active },
    },
  })

  return Response.json({ data: after })
}
