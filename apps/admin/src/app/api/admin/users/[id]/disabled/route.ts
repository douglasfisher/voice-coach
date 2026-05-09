import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

const bodySchema = z.object({
  disabled: z.boolean(),
  /** Free-text reason captured in the audit log so we have a record of
   * why an account was suspended. Optional, but encouraged. */
  reason: z.string().max(500).optional(),
})

/**
 * PATCH /api/admin/users/[id]/disabled
 *
 * Soft-ban toggle. Sets user_profiles.disabled. The mobile/web app
 * checks this flag at session bootstrap and refuses to load.
 *
 * Rules:
 * - Admin can suspend other regular users.
 * - Superadmins can suspend admins.
 * - Nobody can suspend a superadmin via this route (use direct SQL).
 * - You can't suspend yourself (foot-gun, locks you out).
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

  if (id === gate.ctx.userId) {
    return Response.json(
      { error: "cannot_disable_self" },
      { status: 400 }
    )
  }

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: before, error: readErr } = await admin
    .from("user_profiles")
    .select("id, role, disabled")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  if (before.role === "superadmin") {
    return Response.json(
      { error: "cannot_disable_superadmin" },
      { status: 403 }
    )
  }
  // Admins can only disable users, not other admins. Superadmin gate
  // for admin-level targets keeps the chain of command intact.
  if (before.role === "admin" && gate.ctx.role !== "superadmin") {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  if (before.disabled === payload.disabled) {
    return Response.json({ data: before })
  }

  const { data: after, error: writeErr } = await admin
    .from("user_profiles")
    .update({ disabled: payload.disabled })
    .eq("id", id)
    .select("id, role, disabled")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: payload.disabled
      ? "user.disable"
      : "user.enable",
    targetTable: "user_profiles",
    targetId: id,
    diff: {
      before: { disabled: before.disabled },
      after: { disabled: after.disabled, reason: payload.reason ?? null },
    },
  })

  return Response.json({ data: after })
}
