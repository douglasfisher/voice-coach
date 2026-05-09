import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

/**
 * POST /api/admin/users/[id]/password-reset
 *
 * Triggers Supabase auth's password recovery flow on behalf of the
 * user. Uses generateLink('recovery'); Supabase emails the link to the
 * user's address. The reset URL itself is not returned in the response —
 * it's a sensitive credential and we don't want it in the admin's
 * browser tab/screenshots.
 *
 * For the test/staging case where SMTP isn't wired, the link is
 * available in the Supabase dashboard logs; admins can copy it from
 * there if needed (rather than expose it via this endpoint).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Need the email to issue the recovery link.
  const { data: profile, error: profileErr } = await admin
    .from("admin_users_overview")
    .select("email")
    .eq("id", id)
    .maybeSingle()
  if (profileErr || !profile?.email) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const { error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  })
  if (linkErr) {
    return Response.json(
      { error: "generate_link_failed", message: linkErr.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "user.password_reset.send",
    targetTable: "user_profiles",
    targetId: id,
    diff: { before: null, after: { email: profile.email } },
  })

  return Response.json({ ok: true })
}
