import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatRelative } from "@/lib/format"

export const metadata = { title: "Dashboard · Dialectica Admin" }

async function loadKpis() {
  const supabase = await createSupabaseServerClient()

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [users, personas, conversations, recent24h, recent7d, latestUsers] =
    await Promise.all([
      supabase.from("user_profiles").select("*", { count: "exact", head: true }),
      supabase.from("personas").select("*", { count: "exact", head: true }),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gte("started_at", dayAgo),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gte("started_at", weekAgo),
      supabase
        .from("admin_users_overview")
        .select("id, email, display_name, role, auth_created_at, last_sign_in_at")
        .order("auth_created_at", { ascending: false })
        .limit(5),
    ])

  return {
    users: users.count ?? 0,
    personas: personas.count ?? 0,
    conversations: conversations.count ?? 0,
    convLast24h: recent24h.count ?? 0,
    convLast7d: recent7d.count ?? 0,
    latestUsers: latestUsers.data ?? [],
  }
}

export default async function DashboardPage() {
  const kpis = await loadKpis()
  const avgDay = kpis.convLast7d / 7

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Health, growth and recent activity at a glance."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total users"
          value={kpis.users.toLocaleString()}
          hint="all-time"
        />
        <Kpi
          label="Active personas"
          value={kpis.personas.toLocaleString()}
          hint="coaches, advisors, challengers"
        />
        <Kpi
          label="Conversations"
          value={kpis.conversations.toLocaleString()}
          hint={`${kpis.convLast24h.toLocaleString()} in last 24h`}
          delta={{
            value: kpis.convLast24h,
            baseline: avgDay,
          }}
        />
        <Kpi
          label="AI spend (24h)"
          value="—"
          hint="charts coming soon"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Newest accounts</CardTitle>
            <CardDescription>Most recent sign-ups.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {kpis.latestUsers.length === 0 ? (
              <p className="text-muted-foreground px-6 pb-6 text-sm">
                No users yet.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {kpis.latestUsers.map((u) => (
                  <li
                    key={u.id ?? ""}
                    className="hover:bg-muted/50 flex items-center justify-between px-6 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {u.display_name || u.email || "—"}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {u.email}
                      </div>
                    </div>
                    <div className="text-muted-foreground ml-4 shrink-0 text-xs tabular-nums">
                      joined {formatRelative(u.auth_created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Conversations started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Last 24 hours" value={kpis.convLast24h} />
            <Stat label="Last 7 days" value={kpis.convLast7d} />
            <Stat
              label="Average / day (7d)"
              value={Math.round(avgDay).toLocaleString()}
              muted
            />
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
  delta,
}: {
  label: string
  value: string
  hint?: string
  delta?: { value: number; baseline: number }
}) {
  let deltaNode: React.ReactNode = null
  if (delta && delta.baseline > 0) {
    const ratio = (delta.value - delta.baseline) / delta.baseline
    const pct = Math.round(ratio * 100)
    if (Math.abs(pct) < 1) {
      deltaNode = (
        <span className="text-muted-foreground inline-flex items-center text-xs">
          <Minus className="mr-0.5 size-3" />
          on trend
        </span>
      )
    } else if (pct > 0) {
      deltaNode = (
        <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="mr-0.5 size-3" />
          {pct}% vs avg
        </span>
      )
    } else {
      deltaNode = (
        <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400">
          <ArrowDownRight className="mr-0.5 size-3" />
          {pct}% vs avg
        </span>
      )
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription className="text-[11px] tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle className="font-sans text-3xl tabular-nums">
          {value}
        </CardTitle>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          {hint ? <span>{hint}</span> : <span />}
          {deltaNode}
        </div>
      </CardHeader>
    </Card>
  )
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string
  value: string | number
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className={
          muted ? "text-muted-foreground text-xs" : "text-sm"
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          muted ? "text-muted-foreground text-sm" : "text-lg font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
