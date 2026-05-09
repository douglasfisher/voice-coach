import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const idParam = z.string().uuid()

type Row = {
  conversation_id: string | null
  total_tokens: number | null
  estimated_cost_cents: number | null
  latency_ms: number | null
  created_at: string | null
  task_type: string | null
}

/**
 * GET /api/admin/personas/[id]/performance?days=30
 *
 * Returns per-persona performance metrics over the requested window:
 * total cost, conversation count, $/conversation, p50/p95 latency for
 * chat-task rows, top 5 expensive conversations, daily spend trend.
 *
 * Aggregation is done in JS — for typical persona volumes (hundreds of
 * conversations / month) the row count is small enough that a single
 * select beats round-tripping multiple aggregate queries.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!idParam.safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const url = new URL(req.url)
  const days = Math.min(
    Math.max(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1),
    90
  )

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("ai_usage")
    .select(
      "conversation_id, total_tokens, estimated_cost_cents, latency_ms, created_at, task_type"
    )
    .eq("persona_id", id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000)

  if (error) {
    return Response.json(
      { error: "read_failed", message: error.message },
      { status: 500 }
    )
  }

  const rows = (data ?? []) as Row[]

  // Totals
  const totalCostCents = rows.reduce(
    (n, r) => n + (r.estimated_cost_cents ?? 0),
    0
  )
  const totalTokens = rows.reduce((n, r) => n + (r.total_tokens ?? 0), 0)
  const totalRequests = rows.length

  // Distinct conversations
  const convoSet = new Set<string>()
  for (const r of rows) if (r.conversation_id) convoSet.add(r.conversation_id)
  const conversations = convoSet.size

  // Chat-task latency percentiles. Filter to "chat" because scenario /
  // greeting calls have very different shapes; mixing them gives a
  // misleading p50.
  const chatLatencies = rows
    .filter((r) => r.task_type === "chat" && typeof r.latency_ms === "number")
    .map((r) => r.latency_ms as number)
    .sort((a, b) => a - b)

  // Per-conversation cost (for "expensive conversations" list)
  const perConvo = new Map<
    string,
    { cost_cents: number; tokens: number; requests: number }
  >()
  for (const r of rows) {
    if (!r.conversation_id) continue
    const cur = perConvo.get(r.conversation_id) ?? {
      cost_cents: 0,
      tokens: 0,
      requests: 0,
    }
    cur.cost_cents += r.estimated_cost_cents ?? 0
    cur.tokens += r.total_tokens ?? 0
    cur.requests += 1
    perConvo.set(r.conversation_id, cur)
  }
  const topConversations = Array.from(perConvo.entries())
    .map(([conversation_id, v]) => ({ conversation_id, ...v }))
    .sort((a, b) => b.cost_cents - a.cost_cents)
    .slice(0, 5)

  // Daily trend (UTC)
  const perDay: Record<string, number> = {}
  for (const r of rows) {
    if (!r.created_at) continue
    const day = r.created_at.slice(0, 10)
    perDay[day] = (perDay[day] ?? 0) + (r.estimated_cost_cents ?? 0)
  }
  const trend = Object.entries(perDay)
    .map(([day, cents]) => ({ day, cost_usd: cents / 100 }))
    .sort((a, b) => a.day.localeCompare(b.day))

  return Response.json({
    data: {
      window_days: days,
      total_cost_cents: totalCostCents,
      total_tokens: totalTokens,
      total_requests: totalRequests,
      conversations,
      cost_per_conversation_cents:
        conversations > 0 ? Math.round(totalCostCents / conversations) : 0,
      latency_chat: {
        sample_size: chatLatencies.length,
        p50_ms: percentile(chatLatencies, 0.5),
        p95_ms: percentile(chatLatencies, 0.95),
      },
      top_conversations: topConversations,
      daily_trend: trend,
    },
  })
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p))
  )
  return sorted[idx]
}
