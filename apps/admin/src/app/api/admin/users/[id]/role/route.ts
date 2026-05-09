import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

const bodySchema = z.object({
  role: z.enum(["user", "admin"]),
})

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

  // No self-demotion: reduces foot-gun where the only admin demotes themselves.
  if (id === gate.ctx.userId) {
    return Response.json(
      { error: "cannot_change_own_role" },
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
    .select("id, role, is_admin")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // Only superadmins can demote a superadmin (and we don't allow promoting TO
  // superadmin from this UI — that's reserved for direct SQL).
  if (before.role === "superadmin" && gate.ctx.role !== "superadmin") {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  if (before.role === payload.role) {
    return Response.json({ data: before })
  }

  const { data: after, error: writeErr } = await admin
    .from("user_profiles")
    .update({ role: payload.role })
    .eq("id", id)
    .select("id, role, is_admin")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "user.role.update",
    targetTable: "user_profiles",
    targetId: id,
    diff: {
      before: { role: before.role },
      after: { role: after.role },
    },
  })

  return Response.json({ data: after })
}
