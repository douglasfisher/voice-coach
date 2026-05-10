import Link from "next/link"
import { ArrowRight, Sparkles, Code2 } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { CATALOGUE, GROUPS, type ConfigEntry } from "./config-catalogue"

export const metadata = { title: "AI config · Dialectica Admin" }

export default async function AiConfigPage() {
  await requireAdminPage()

  const grouped = GROUPS.map((g) => ({
    group: g,
    entries: CATALOGUE.filter((c) => c.group === g),
  })).filter((g) => g.entries.length > 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI config"
        description="Every database-driven AI prompt and setting in the app. Changes apply on the next request — no redeploy. Entries with a typed editor open a hand-built form; the rest open a JSON editor that replaces the whole row on save."
      />

      {grouped.map(({ group, entries }) => (
        <section key={group}>
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            {group}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((c) => (
              <ConfigCard key={c.key} entry={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ConfigCard({ entry }: { entry: ConfigEntry }) {
  const href = entry.editor === "typed" && entry.href
    ? entry.href
    : `/admin/ai-config/raw/${encodeURIComponent(entry.key)}`
  const Icon = entry.editor === "typed" ? Sparkles : Code2

  return (
    <Card className="group transition-colors hover:bg-muted/40">
      <Link href={href} className="block">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="text-primary size-4 shrink-0" />
              <CardTitle className="text-base">{entry.title}</CardTitle>
            </div>
            <EditorBadge editor={entry.editor} />
          </div>
          <CardDescription className="text-xs">
            {entry.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">
              {entry.key}
            </span>
            <span className="text-muted-foreground inline-flex items-center group-hover:text-foreground">
              Edit <ArrowRight className="ml-1 size-3" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

function EditorBadge({ editor }: { editor: ConfigEntry["editor"] }) {
  if (editor === "typed") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
      >
        typed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      raw JSON
    </Badge>
  )
}
