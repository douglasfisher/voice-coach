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

const cellSchema = z.object({
  tier: z.enum(TIERS),
  feature_key: z.string().min(1).max(80),
  // Boolean, number, or explicit null (= unlimited / unset).
  // Strings are not accepted — feature kinds are boolean | number only.
  value: z.union([z.boolean(), z.number(), z.null()]),
})

const bodySchema = z.object({
  /** Cells to upsert. */
  upserts: z.array(cellSchema).default([]),
  /** Cells to remove (i.e. inherit from lower tier / catalogue default). */
  deletes: z
    .array(
      z.object({
        tier: z.enum(TIERS),
        feature_key: z.string().min(1).max(80),
      })
    )
    .default([]),
})

/**
 * POST /api/admin/tier-features
 *
 * Bulk-edit the feature × tier matrix. The admin UI assembles the diff
 * client-side (compare current state vs edited state) and submits the
 * minimal set of upserts + deletes in one call.
 *
 * The 60s server-side cache in supabase/functions/_shared/features.ts
 * means changes take up to a minute to propagate to live edge calls.
 * Admins who need faster feedback can hit any other admin route to
 * trigger a route handler invocation that's typically deployed with
 * a fresher cache state.
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

  if (payload.upserts.length === 0 && payload.deletes.length === 0) {
    return Response.json({ data: { upserts: 0, deletes: 0 } })
  }

  const admin = createSupabaseAdminClient()

  // Validate: every upsert's value must match the catalogue's `kind`
  // for that feature. Stops a typo'd JSON from putting a number into a
  // boolean feature and breaking resolution downstream.
  const keys = Array.from(
    new Set(payload.upserts.map((u) => u.feature_key))
  )
  if (keys.length > 0) {
    const { data: catalogue, error: catalogueErr } = await admin
      .from("feature_flags")
      .select("key, kind, deprecated")
      .in("key", keys)
    if (catalogueErr) {
      return Response.json(
        { error: "catalogue_lookup_failed", message: catalogueErr.message },
        { status: 500 }
      )
    }
    const kindByKey = new Map(
      (catalogue ?? []).map((c: { key: string; kind: string }) => [
        c.key,
        c.kind,
      ])
    )
    for (const u of payload.upserts) {
      const kind = kindByKey.get(u.feature_key)
      if (!kind) {
        return Response.json(
          {
            error: "unknown_feature_key",
            feature_key: u.feature_key,
          },
          { status: 400 }
        )
      }
      if (kind === "boolean" && typeof u.value !== "boolean") {
        return Response.json(
          {
            error: "value_kind_mismatch",
            feature_key: u.feature_key,
            expected: "boolean",
          },
          { status: 400 }
        )
      }
      if (kind === "number" && u.value !== null && typeof u.value !== "number") {
        return Response.json(
          {
            error: "value_kind_mismatch",
            feature_key: u.feature_key,
            expected: "number_or_null",
          },
          { status: 400 }
        )
      }
    }
  }

  // Apply upserts.
  let upsertCount = 0
  if (payload.upserts.length > 0) {
    const rows = payload.upserts.map((u) => ({
      tier: u.tier as Tier,
      feature_key: u.feature_key,
      value: u.value,
      updated_at: new Date().toISOString(),
      updated_by: gate.ctx.userId,
    }))
    const { error: upsertErr } = await admin
      .from("tier_features")
      .upsert(rows, { onConflict: "tier,feature_key" })
    if (upsertErr) {
      return Response.json(
        { error: "upsert_failed", message: upsertErr.message },
        { status: 500 }
      )
    }
    upsertCount = rows.length
  }

  // Apply deletes (set-of-(tier, key) pairs). Postgrest doesn't support
  // composite-key deletes in one round trip, so we issue one per pair.
  // Realistic edits delete a handful of cells, not hundreds, so the
  // round-trip count is fine.
  let deleteCount = 0
  for (const d of payload.deletes) {
    const { error: delErr } = await admin
      .from("tier_features")
      .delete()
      .eq("tier", d.tier as Tier)
      .eq("feature_key", d.feature_key)
    if (delErr) {
      console.error("[tier-features] delete failed", d, delErr)
      continue
    }
    deleteCount++
  }

  await audit(gate.ctx, {
    action: "tier_features.bulk_update",
    targetTable: "tier_features",
    targetId: null,
    diff: {
      before: null,
      after: {
        upserts: payload.upserts,
        deletes: payload.deletes,
      },
    },
  })

  return Response.json({
    data: { upserts: upsertCount, deletes: deleteCount },
  })
}
