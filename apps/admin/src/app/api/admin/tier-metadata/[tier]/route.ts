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
type Tier = (typeof TIERS)[number]

const bodySchema = z.object({
  display_name: z.string().trim().min(1).max(50).optional(),
  short_description: z.string().trim().max(200).nullable().optional(),
  marketing_description: z.string().trim().max(2000).nullable().optional(),
  monthly_price_cents: z.number().int().min(0).nullable().optional(),
  annual_price_cents: z.number().int().min(0).nullable().optional(),
  badge_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "expected #RRGGBB")
    .nullable()
    .optional(),
  is_visible_in_pricing: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
})

/**
 * PATCH /api/admin/tier-metadata/[tier]
 *
 * Update display + commercial config for a single tier. Price changes
 * (monthly/annual) and visibility changes require superadmin since
 * they're commercially sensitive. Display tweaks (name, description,
 * badge colour, sort order) are admin-OK.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tier: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { tier: tierRaw } = await params
  if (!(TIERS as readonly string[]).includes(tierRaw)) {
    return Response.json({ error: "invalid_tier" }, { status: 400 })
  }
  const tier = tierRaw as Tier

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

  const touchesCommercial =
    payload.monthly_price_cents !== undefined ||
    payload.annual_price_cents !== undefined ||
    payload.is_visible_in_pricing !== undefined
  if (touchesCommercial && gate.ctx.role !== "superadmin") {
    return Response.json(
      { error: "forbidden_superadmin_only_for_commercial_changes" },
      { status: 403 }
    )
  }

  const admin = createSupabaseAdminClient()

  const { data: before, error: readErr } = await admin
    .from("tier_metadata")
    .select("*")
    .eq("tier", tier)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const update = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  const { data: after, error: writeErr } = await admin
    .from("tier_metadata")
    .update(update)
    .eq("tier", tier)
    .select("*")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "tier.metadata.update",
    targetTable: "tier_metadata",
    targetId: tier,
    diff: { before, after },
  })

  return Response.json({ data: after })
}
