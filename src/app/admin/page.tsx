import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const metadata = { title: "Dashboard · Dialectica Admin" }

async function loadKpis() {
  const supabase = await createSupabaseServerClient()
  const [users, personas, conversations] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("personas")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true }),
  ])
  return {
    users: users.count ?? null,
    personas: personas.count ?? null,
    conversations: conversations.count ?? null,
  }
}

export default async function DashboardPage() {
  const kpis = await loadKpis()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          High-level overview of the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Users" value={kpis.users} />
        <Kpi label="Personas" value={kpis.personas} />
        <Kpi label="Conversations" value={kpis.conversations} />
        <Kpi label="AI spend (24h)" value="—" hint="charts coming soon" />
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string | null
  hint?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {value ?? "—"}
        </CardTitle>
        {hint ? (
          <p className="text-muted-foreground text-xs">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}
