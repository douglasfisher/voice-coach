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
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { UsageTrendChart } from "@/app/admin/usage/usage-trend-chart"

type UsageRow = {
  task_type: string | null
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  estimated_cost_cents: number | null
  created_at: string | null
}

async function loadSpend(userId: string) {
  // Capture `now` inside the async loader so the page render body
  // stays pure for React Compiler.
  const now = Date.now()
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since24h = now - 24 * 60 * 60 * 1000
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("ai_usage")
    .select(
      "task_type, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_cents, created_at"
    )
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
  return { rows: (data ?? []) as UsageRow[], error, since24h }
}

export async function UserSpendTab({ userId }: { userId: string }) {
  const { rows, error, since24h } = await loadSpend(userId)

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load spend: {error.message}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        No AI spend in the last 30 days.
      </div>
    )
  }

  const r24 = rows.filter(
    (r) => r.created_at && new Date(r.created_at).getTime() >= since24h
  )
  const cost24 = sum(r24.map((r) => r.estimated_cost_cents ?? 0))
  const tokens24 = sum(r24.map((r) => r.total_tokens ?? 0))
  const cost30 = sum(rows.map((r) => r.estimated_cost_cents ?? 0))
  const tokens30 = sum(rows.map((r) => r.total_tokens ?? 0))

  const perTask = group(rows, (r) => r.task_type ?? "(unknown)")
  const taskTable = Object.entries(perTask)
    .map(([task, list]) => ({
      task,
      requests: list.length,
      tokens: sum(list.map((r) => r.total_tokens ?? 0)),
      cost_cents: sum(list.map((r) => r.estimated_cost_cents ?? 0)),
    }))
    .sort((a, b) => b.cost_cents - a.cost_cents)

  const perDay: Record<string, number> = {}
  for (const r of rows) {
    if (!r.created_at) continue
    const day = r.created_at.slice(0, 10)
    perDay[day] = (perDay[day] ?? 0) + (r.estimated_cost_cents ?? 0)
  }
  const trend = Object.entries(perDay)
    .map(([day, cents]) => ({ day, cost_usd: cents / 100 }))
    .sort((a, b) => a.day.localeCompare(b.day))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={
            <a
              href={`/api/admin/usage/export?userId=${encodeURIComponent(userId)}&days=30`}
              download
            >
              <Download className="mr-1 size-4" />
              Export CSV
            </a>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="24h spend" value={`$${(cost24 / 100).toFixed(2)}`} />
        <Kpi label="24h tokens" value={tokens24.toLocaleString()} />
        <Kpi label="30d spend" value={`$${(cost30 / 100).toFixed(2)}`} />
        <Kpi label="30d tokens" value={tokens30.toLocaleString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily spend</CardTitle>
            <CardDescription>Last 30 days, USD per UTC day.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By task type</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskTable.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.task}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-[11px] tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle className="font-sans text-2xl tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function sum(arr: number[]): number {
  let n = 0
  for (const v of arr) n += v
  return n
}

function group<T>(rows: T[], keyFn: (row: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const r of rows) {
    const k = keyFn(r)
    if (!out[k]) out[k] = []
    out[k].push(r)
  }
  return out
}
