"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UsageTrendChart } from "@/app/admin/usage/usage-trend-chart"

type PerformanceData = {
  window_days: number
  total_cost_cents: number
  total_tokens: number
  total_requests: number
  conversations: number
  cost_per_conversation_cents: number
  latency_chat: {
    sample_size: number
    p50_ms: number | null
    p95_ms: number | null
  }
  top_conversations: Array<{
    conversation_id: string
    cost_cents: number
    tokens: number
    requests: number
  }>
  daily_trend: Array<{ day: string; cost_usd: number }>
}

/**
 * Performance tab — only mounted in edit mode, fetches metrics for the
 * given persona on mount. Lives inside the (client) PersonaEditor so it
 * has access to personaId without a route change.
 */
export function PerformanceTab({ personaId }: { personaId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/admin/personas/${personaId}/performance?days=30`
        )
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) {
          setData(body.data as PerformanceData)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId])

  if (loading) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        Loading performance metrics…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive rounded-lg border py-12 text-center text-sm">
        Failed to load: {error}
      </div>
    )
  }

  if (!data || data.total_requests === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        No usage in the last 30 days for this persona.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Spend · 30d"
          value={`$${(data.total_cost_cents / 100).toFixed(2)}`}
          hint={`${data.total_requests.toLocaleString()} requests · ${data.total_tokens.toLocaleString()} tokens`}
        />
        <Kpi
          label="Conversations · 30d"
          value={data.conversations.toLocaleString()}
        />
        <Kpi
          label="$ / conversation"
          value={`$${(data.cost_per_conversation_cents / 100).toFixed(3)}`}
        />
        <Kpi
          label="Chat latency p50 / p95"
          value={
            data.latency_chat.p50_ms == null
              ? "—"
              : `${data.latency_chat.p50_ms}ms / ${data.latency_chat.p95_ms ?? "—"}ms`
          }
          hint={
            data.latency_chat.sample_size > 0
              ? `n=${data.latency_chat.sample_size} chat requests`
              : "no chat samples"
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Daily spend (last 30 days)</CardTitle>
          <CardDescription>USD per UTC day, this persona only.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageTrendChart data={data.daily_trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most expensive conversations</CardTitle>
          <CardDescription>
            Top 5 by spend. Click to inspect.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conversation</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_conversations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No conversations.
                  </TableCell>
                </TableRow>
              ) : (
                data.top_conversations.map((c) => (
                  <TableRow key={c.conversation_id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/admin/conversations/${c.conversation_id}`}
                        className="text-primary hover:underline"
                      >
                        {c.conversation_id.slice(0, 8)}…
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${(c.cost_cents / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-[11px] tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle className="font-sans text-2xl tabular-nums">
          {value}
        </CardTitle>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardHeader>
    </Card>
  )
}
