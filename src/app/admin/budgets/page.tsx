import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { BudgetEditor } from "./budget-editor"

export const metadata = { title: "Budgets · Dialectica Admin" }
export const dynamic = "force-dynamic"

type Budget = {
  id: string
  name: string
  budget_type: string
  limit_cents: number
  alert_threshold_percent: number | null
  current_spend_cents: number | null
  period_start: string | null
  period_end: string | null
  is_active: boolean | null
  notify_on_threshold: boolean | null
  notify_on_exceeded: boolean | null
}

async function loadBudgets() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("ai_budgets")
    .select("*")
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Budget[]
}

/**
 * Live month-to-date spend computed from ai_usage. Used as the source of
 * truth on the dashboard since current_spend_cents on the row is updated
 * by a trigger that may lag (and historically did fail silently).
 */
async function loadMtdSpendCents(): Promise<number> {
  const supabase = await createSupabaseServerClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)
  const { data } = await supabase
    .from("ai_usage")
    .select("estimated_cost_cents")
    .gte("created_at", startOfMonth.toISOString())
  return (data ?? []).reduce(
    (sum, r) => sum + (r.estimated_cost_cents ?? 0),
    0
  )
}

export default async function BudgetsPage() {
  await requireAdminPage()
  const [budgets, mtdSpendCents] = await Promise.all([
    loadBudgets(),
    loadMtdSpendCents(),
  ])

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Monthly AI spend caps + alert thresholds. Informational only — enforcement (rejecting requests when over) is a follow-up."
      />

      <div className="text-muted-foreground mt-2 text-xs">
        Month-to-date spend (live from ai_usage):{" "}
        <strong className="text-foreground tabular-nums">
          ${(mtdSpendCents / 100).toFixed(2)}
        </strong>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {budgets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No budgets configured</CardTitle>
              <CardDescription>
                Create a row in <code>ai_budgets</code> via SQL — the
                editor here only updates existing rows. The default seeded
                budget should already exist; if not, see migration 025.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          budgets.map((b) => {
            // Always show the live MTD figure — the row's
            // current_spend_cents may lag (trigger-updated), so we trust
            // the live aggregate for the dashboard chip.
            const liveSpend =
              b.budget_type === "monthly"
                ? mtdSpendCents
                : (b.current_spend_cents ?? 0)
            const pct =
              b.limit_cents === 0
                ? 0
                : (liveSpend / b.limit_cents) * 100
            const exceeded = pct >= 100
            const warned =
              !exceeded &&
              pct >= (b.alert_threshold_percent ?? 80)

            return (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{b.name}</CardTitle>
                    {exceeded ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 size-3" />
                        Over budget
                      </Badge>
                    ) : warned ? (
                      <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
                        <AlertTriangle className="mr-1 size-3" />
                        Approaching
                      </Badge>
                    ) : b.is_active ? (
                      <Badge className="bg-emerald-500/85 text-emerald-950 hover:bg-emerald-500/85">
                        <CheckCircle2 className="mr-1 size-3" />
                        Healthy
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {b.budget_type} · alert at {b.alert_threshold_percent}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        Spend
                      </span>
                      <span className="tabular-nums">
                        ${(liveSpend / 100).toFixed(2)} / $
                        {(b.limit_cents / 100).toFixed(0)}{" "}
                        <span className="text-muted-foreground">
                          ({pct.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="bg-muted relative h-2 overflow-hidden rounded-full">
                      <div
                        className={
                          exceeded
                            ? "bg-destructive absolute inset-y-0 left-0"
                            : warned
                              ? "absolute inset-y-0 left-0 bg-amber-500"
                              : "bg-primary absolute inset-y-0 left-0"
                        }
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  <BudgetEditor budget={b} />
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
