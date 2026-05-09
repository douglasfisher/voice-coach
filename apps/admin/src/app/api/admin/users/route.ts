import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

const TIERS = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
] as const
const ROLES = ["user", "admin"] as const

const bodySchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  display_name: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).default("user"),
  tier: z.enum(TIERS).default("free"),
})

/**
 * POST /api/admin/users
 *
 * Create + invite a user. Uses supabase.auth.admin.inviteUserByEmail
 * which sends a magic link to the email; clicking it lands the user on
 * the password-set screen and signs them in. The user_profiles row is
 * created automatically by the existing on_auth_user_created trigger;
 * we then PATCH the role/tier/display_name we want.
 *
 * Rules:
 * - Promoting to admin during invite is allowed only by other admins
 *   (already gated by requireAdminApi).
 * - Promoting to superadmin is never allowed via this UI — direct SQL
 *   only. The schema enum allows it but this route's zod refuses.
 * - The invited address is captured in the audit log so duplicate
 *   invites and bot-created accounts are traceable.
 */
export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

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

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    payload.email,
    {
      data: payload.display_name
        ? { display_name: payload.display_name }
        : undefined,
    }
  )
  if (inviteErr || !invited?.user) {
    return Response.json(
      {
        error: "invite_failed",
        message: inviteErr?.message ?? "unknown",
      },
      { status: 500 }
    )
  }

  const newUserId = invited.user.id

  // Apply role + tier overrides on the freshly-created user_profiles
  // row (the on_auth_user_created trigger inserts with defaults).
  // Best-effort — invite already succeeded, so log but don't fail the
  // request if the patch hits a transient error.
  const { error: patchErr } = await admin
    .from("user_profiles")
    .update({
      role: payload.role,
      subscription_tier: payload.tier,
      display_name: payload.display_name ?? null,
      // Keep is_admin in sync with role so legacy code paths that read
      // is_admin still work for newly-invited admins.
      is_admin: payload.role === "admin",
    })
    .eq("id", newUserId)
  if (patchErr) {
    console.error("[invite] post-invite profile patch failed", patchErr)
  }

  await audit(gate.ctx, {
    action: "user.invite",
    targetTable: "auth.users",
    targetId: newUserId,
    diff: {
      before: null,
      after: {
        email: payload.email,
        display_name: payload.display_name ?? null,
        role: payload.role,
        subscription_tier: payload.tier,
      },
    },
  })

  return Response.json({
    data: {
      id: newUserId,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
    },
  })
}
