import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

const bodySchema = z.object({
  admin_notes: z.string().max(10_000),
})

/**
 * PATCH /api/admin/users/[id]/notes
 *
 * Save admin notes for a user. Audit-logged so prior versions are
 * recoverable from the trail (each save snapshots before/after).
 *
 * No diff suppression — even no-op saves get audited so admins know
 * who looked at the field. Cap is 10K chars to prevent abuse without
 * being annoying for genuine multi-paragraph context.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await req.json())
  } catch (err) {
    return Response.json(
      {
        error: "invalid_body",
        details: err instanceof z.ZodError ? err.issues : undefined,
      },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()

  const { data: before, error: readErr } = await admin
    .from("user_profiles")
    .select("id, admin_notes")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // Trim trailing whitespace; empty string → null so the column
  // distinguishes "explicitly cleared" from "never set".
  const next = payload.admin_notes.trim() || null

  if ((before.admin_notes ?? null) === next) {
    return Response.json({ data: before })
  }

  const { data: after, error: writeErr } = await admin
    .from("user_profiles")
    .update({ admin_notes: next })
    .eq("id", id)
    .select("id, admin_notes")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "user.notes.update",
    targetTable: "user_profiles",
    targetId: id,
    diff: {
      before: { admin_notes: before.admin_notes },
      after: { admin_notes: after.admin_notes },
    },
  })

  return Response.json({ data: after })
}
