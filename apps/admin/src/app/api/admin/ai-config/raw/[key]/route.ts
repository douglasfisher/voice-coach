import { z } from "zod"

import { audit } from "@/lib/audit"
import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Allowlist of app_settings keys this generic raw-JSON editor can
 * read/write. The list is open-ended on purpose — every "ai_*" key plus
 * a handful of operational rows that admins legitimately edit.
 *
 * The deliberate exclusion is anything we don't want admins poking at
 * via raw JSON: tier_features lives in its own table, daily_challenges_batch
 * is rebuilt by the chat fn, etc.
 */
const ALLOWED_PREFIXES = ["ai_"] as const
const EXTRA_ALLOWED = new Set<string>([
  // Operational toggles that are runtime-tunable but shouldn't have
  // accidental edits — admins reach these through the raw editor only.
  "maintenance_mode",
  "featured_persona_id",
  "cost_markup_percent",
])

function isKeyAllowed(key: string): boolean {
  if (ALLOWED_PREFIXES.some((p) => key.startsWith(p))) return true
  if (EXTRA_ALLOWED.has(key)) return true
  return false
}

const keySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_]+$/, "expected lowercase snake_case")

const bodySchema = z.object({
  // The full new value as parsed JSON. Anything postgres jsonb accepts:
  // object / array / string / number / boolean / null.
  value: z.unknown(),
})

/**
 * GET /api/admin/ai-config/raw/[key]
 *
 * Returns the current value of an app_settings row. 404 if the key
 * doesn't exist or isn't on the allowlist (we don't leak which is which
 * to discourage probing).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { key } = await params
  if (!keySchema.safeParse(key).success || !isKeyAllowed(key)) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle()
  if (error) {
    return Response.json(
      { error: "read_failed", message: error.message },
      { status: 500 }
    )
  }
  if (!data) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  return Response.json({ data })
}

/**
 * PATCH /api/admin/ai-config/raw/[key]
 *
 * Replaces the row's `value` with the parsed JSON in the body. Audit-logged
 * with full before/after so a bad edit can be reverted by reading the
 * audit row.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { key } = await params
  if (!keySchema.safeParse(key).success || !isKeyAllowed(key)) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: before, error: readErr } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle()
  if (readErr) {
    return Response.json(
      { error: "read_failed", message: readErr.message },
      { status: 500 }
    )
  }
  if (!before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const { data: after, error: writeErr } = await admin
    .from("app_settings")
    .update({
      value: payload.value as never,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key)
    .select("value, updated_at")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "app_settings.raw_update",
    targetTable: "app_settings",
    targetId: key,
    diff: {
      before: { value: before.value },
      after: { value: after.value },
    },
  })

  return Response.json({ data: after })
}
