import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/usage/export?userId=&days=&taskType=&model=
 *
 * Streams a CSV of ai_usage rows. Used by the Export buttons on the
 * usage and per-user spend pages. All filters are optional; userId
 * narrows to a single user, days defaults to 30, taskType/model
 * narrow further.
 *
 * Audit-logged because it's a data export — finance / compliance may
 * need to know who pulled what.
 */
const querySchema = z.object({
  userId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
  taskType: z.string().max(40).optional(),
  model: z.string().max(120).optional(),
})

const COLUMNS = [
  "created_at",
  "user_id",
  "conversation_id",
  "persona_id",
  "task_type",
  "model",
  "prompt_tokens",
  "completion_tokens",
  "total_tokens",
  "estimated_cost_cents",
] as const

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  // Quote if contains comma, quote, newline, or carriage return.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { userId, days, taskType, model } = parsed.data

  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString()

  const admin = createSupabaseAdminClient()
  let query = admin
    .from("ai_usage")
    .select(COLUMNS.join(", "))
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50000) // hard cap to keep memory bounded

  if (userId) query = query.eq("user_id", userId)
  if (taskType) query = query.eq("task_type", taskType)
  if (model) query = query.eq("model", model)

  const { data, error } = await query
  if (error) {
    return Response.json(
      { error: "query_failed", message: error.message },
      { status: 500 }
    )
  }

  // Cast through unknown — Supabase's typed select on a runtime-built
  // column string can't resolve to a row type at compile time.
  const rows = ((data ?? []) as unknown) as Array<Record<string, unknown>>
  const headerLine = COLUMNS.join(",")
  const dataLines = rows.map((r) =>
    COLUMNS.map((c) => csvEscape(r[c])).join(",")
  )
  const csv = [headerLine, ...dataLines].join("\n")

  await audit(gate.ctx, {
    action: "ai_usage.export",
    targetTable: "ai_usage",
    targetId: userId ?? null,
    diff: {
      before: null,
      after: { days, userId: userId ?? null, taskType, model, rows: rows.length },
    },
  })

  const filename = userId
    ? `usage-${userId.slice(0, 8)}-${days}d.csv`
    : `usage-${days}d.csv`
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
