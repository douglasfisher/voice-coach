import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { PageHeader } from "@/components/admin/page-header"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { UsageTrendChart } from "./usage-trend-chart"

export const metadata = { title: "AI usage · Dialectica Admin" }
export const dynamic = "force-dynamic"

type UsageRow = {
  user_id: string | null
  persona_id: string | null
  model: string | null
  task_type: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  estimated_cost_cents: number | null
  created_at: string | null
}

async function loadUsage(): Promise<{ rows: UsageRow[]; now: number }> {
  // Capture `now` in the loader (an async, non-render function) so the
  // page render body stays pure for React Compiler.
  const now = Date.now()
  const supabase = await createSupabaseServerClient()
  // Pull last 30 days. 30 days @ ~10K rows/day max is comfortable to
  // aggregate client-side; if the volume grows, push aggregation server-
  // side via a view or materialised table.
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("ai_usage")
    .select(
      "user_id, persona_id, model, task_type, prompt_tokens, completion_tokens, total_tokens, estimated_cost_cents, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return { rows: (data ?? []) as UsageRow[], now }
}

export default async function UsagePage() {
  await requireAdminPage()
  const { rows, now } = await loadUsage()

  const since24h = now - 24 * 60 * 60 * 1000
  const r24 = rows.filter(
    (r) => r.created_at && new Date(r.created_at).getTime() >= since24h
  )

  // 24h KPIs
  const requests24h = r24.length
  const cost24hCents = sum(r24.map((r) => r.estimated_cost_cents ?? 0))
  const tokens24h = sum(r24.map((r) => r.total_tokens ?? 0))

  // 30-day totals
  const requests30d = rows.length
  const cost30dCents = sum(rows.map((r) => r.estimated_cost_cents ?? 0))
  const tokens30d = sum(rows.map((r) => r.total_tokens ?? 0))

  // Per-model
  const perModel = group(rows, (r) => r.model ?? "(unknown)")
  const modelTable = Object.entries(perModel)
    .map(([model, list]) => ({
      model,
      requests: list.length,
      tokens: sum(list.map((r) => r.total_tokens ?? 0)),
      cost_cents: sum(list.map((r) => r.estimated_cost_cents ?? 0)),
    }))
    .sort((a, b) => b.cost_cents - a.cost_cents)

  // Per-task
  const perTask = group(rows, (r) => r.task_type ?? "(unknown)")
  const taskTable = Object.entries(perTask)
    .map(([task, list]) => ({
      task,
      requests: list.length,
      tokens: sum(list.map((r) => r.total_tokens ?? 0)),
      cost_cents: sum(list.map((r) => r.estimated_cost_cents ?? 0)),
    }))
    .sort((a, b) => b.cost_cents - a.cost_cents)

  // Daily trend (UTC days)
  const perDay: Record<string, number> = {}
  for (const r of rows) {
    if (!r.created_at) continue
    const day = r.created_at.slice(0, 10)
    perDay[day] = (perDay[day] ?? 0) + (r.estimated_cost_cents ?? 0)
  }
  const trend = Object.entries(perDay)
    .map(([day, cents]) => ({ day, cost_usd: cents / 100 }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Top 10 users (resolve emails)
  const perUser = group(
    rows.filter((r) => r.user_id),
    (r) => r.user_id as string
  )
  const topUserIds = Object.entries(perUser)
    .map(([id, list]) => ({
      id,
      cost_cents: sum(list.map((r) => r.estimated_cost_cents ?? 0)),
      requests: list.length,
      tokens: sum(list.map((r) => r.total_tokens ?? 0)),
    }))
    .sort((a, b) => b.cost_cents - a.cost_cents)
    .slice(0, 10)

  const supabase = await createSupabaseServerClient()
  const { data: userRows } = topUserIds.length
    ? await supabase
        .from("admin_users_overview")
        .select("id, email, display_name")
        .in(
          "id",
          topUserIds.map((u) => u.id)
        )
    : { data: [] as Array<{ id: string; email: string; display_name: string }> }
  const userMap = new Map(
    (userRows ?? []).map((u) => [u.id, u.display_name || u.email || u.id])
  )

  return (
    <div>
      <PageHeader
        title="AI usage"
        description="Spend across chat, prompt generation, image generation, and TTS. 30-day rolling window."
        actions={
          <Button
            type="button"
            variant="outline"
            render={
              <a
                href="/api/admin/usage/export?days=30"
                download
              >
                <Download className="mr-1 size-4" />
                Export CSV
              </a>
            }
          />
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Requests · 24h" value={requests24h.toLocaleString()} />
        <Kpi
          label="Spend · 24h"
          value={`$${(cost24hCents / 100).toFixed(2)}`}
        />
        <Kpi label="Tokens · 24h" value={tokens24h.toLocaleString()} />
        <Kpi
          label="Spend · 30d"
          value={`$${(cost30dCents / 100).toFixed(2)}`}
          hint={`${requests30d.toLocaleString()} requests · ${tokens30d.toLocaleString()} tokens`}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily spend (last 30 days)</CardTitle>
            <CardDescription>USD per UTC day.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By task type</CardTitle>
            <CardDescription>Where the spend is going.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <BreakdownTable
              rows={taskTable}
              labelHead="Task"
              labelKey="task"
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By model</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <BreakdownTable
              rows={modelTable}
              labelHead="Model"
              labelKey="model"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top users (last 30 days)</CardTitle>
            <CardDescription>By spend. Anonymous calls (admin-initiated, no user) are excluded.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUserIds.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      No user-attributable spend in the last 30 days.
                    </TableCell>
                  </TableRow>
                ) : (
                  topUserIds.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm">
                        {userMap.get(u.id) ?? u.id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${(u.cost_cents / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
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
        <CardTitle className="font-sans text-3xl tabular-nums">
          {value}
        </CardTitle>
        {hint ? (
          <p className="text-muted-foreground text-xs">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

function BreakdownTable<
  T extends { requests: number; tokens: number; cost_cents: number },
>({
  rows,
  labelHead,
  labelKey,
}: {
  rows: Array<T & Record<string, unknown>>
  labelHead: string
  labelKey: keyof T & string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHead}</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-muted-foreground py-10 text-center text-sm"
            >
              No data.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{String(r[labelKey])}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.requests.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.tokens.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${(r.cost_cents / 100).toFixed(2)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function sum(arr: number[]): number {
  let n = 0
  for (const v of arr) n += v
  return n
}

function group<T>(
  rows: T[],
  keyFn: (row: T) => string
): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const r of rows) {
    const k = keyFn(r)
    if (!out[k]) out[k] = []
    out[k].push(r)
  }
  return out
}
