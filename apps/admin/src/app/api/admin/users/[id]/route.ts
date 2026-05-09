import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

/**
 * DELETE /api/admin/users/[id]
 *
 * Hard delete via supabase.auth.admin.deleteUser. Superadmin-only —
 * this cascades through every FK on user_id (conversations, messages,
 * ai_usage, audit log entries owned by them, etc.) and is irreversible.
 *
 * Use the disable endpoint for everyday "remove access" needs; reserve
 * delete for GDPR right-to-be-forgotten requests, spam accounts, or
 * test cleanup.
 *
 * The audit log entry is written BEFORE the delete because the
 * actor's relation to the deleted user disappears once the row is
 * gone (FK constraints could complicate post-hoc logging).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  if (gate.ctx.role !== "superadmin") {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  if (id === gate.ctx.userId) {
    return Response.json(
      { error: "cannot_delete_self" },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()

  const { data: before, error: readErr } = await admin
    .from("admin_users_overview")
    .select("id, email, display_name, role, subscription_tier")
    .eq("id", id)
    .maybeSingle()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // Audit FIRST so the record survives the delete cascade.
  await audit(gate.ctx, {
    action: "user.delete",
    targetTable: "auth.users",
    targetId: id,
    diff: { before, after: null },
  })

  const { error: delErr } = await admin.auth.admin.deleteUser(id)
  if (delErr) {
    return Response.json(
      { error: "delete_failed", message: delErr.message },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
