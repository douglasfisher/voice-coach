import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const TIERS = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
] as const

const idParam = z.string().uuid()
const bodySchema = z.object({ tier: z.enum(TIERS) })

/**
 * PATCH /api/admin/users/[id]/tier
 *
 * Update subscription_tier on user_profiles. Audit-logged. Self-tier
 * change is allowed for admins (you may want to test the freemium tier
 * yourself), unlike the role mutation which blocks self-changes — tiers
 * are non-privileged.
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
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data: before, error: readErr } = await admin
    .from("user_profiles")
    .select("id, subscription_tier")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  if (before.subscription_tier === parsed.data.tier) {
    return Response.json({ data: before })
  }

  const { data: after, error: writeErr } = await admin
    .from("user_profiles")
    .update({ subscription_tier: parsed.data.tier })
    .eq("id", id)
    .select("id, subscription_tier")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "user.tier.update",
    targetTable: "user_profiles",
    targetId: id,
    diff: {
      before: { subscription_tier: before.subscription_tier },
      after: { subscription_tier: after.subscription_tier },
    },
  })

  return Response.json({ data: after })
}
