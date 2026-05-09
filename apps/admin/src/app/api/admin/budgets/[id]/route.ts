import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * PATCH /api/admin/budgets/[id]
 *
 * Update an ai_budgets row. The current implementation is informational
 * — nothing in the chat function actually rejects requests when a budget
 * is exceeded — but the row drives the dashboard's alert chip. Captured
 * as a follow-up to add real enforcement (raise an error from the chat
 * function once spend > limit).
 */
const idParam = z.string().uuid()
const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  limit_cents: z.number().int().min(0).max(10_000_000).optional(),
  alert_threshold_percent: z.number().int().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  notify_on_threshold: z.boolean().optional(),
  notify_on_exceeded: z.boolean().optional(),
})

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
  const { data: before } = await admin
    .from("ai_budgets")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const { data: after, error } = await admin
    .from("ai_budgets")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single()
  if (error || !after) {
    return Response.json(
      { error: "update_failed", message: error?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "budget.update",
    targetTable: "ai_budgets",
    targetId: id,
    diff: { before, after },
  })

  return Response.json({ data: after })
}
