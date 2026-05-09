import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

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
import { ConversationTabs } from "./conversation-tabs"
import type {
  ReportMessage,
  SessionReportPayload,
  TimingMetrics,
} from "./session-report"

export const metadata = { title: "Conversation · Dialectica Admin" }
export const dynamic = "force-dynamic"

type Message = {
  id: string
  role: string
  content: string
  sequence: number
  created_at: string | null
  response_time_ms: number | null
  metadata: Record<string, unknown> | null
  analysis: Record<string, unknown> | null
}

type UsageRow = {
  id: string
  task_type: string | null
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  estimated_cost_cents: number | null
  latency_ms: number | null
  created_at: string | null
}

async function loadConversation(id: string) {
  // Capture wall-clock now in this async loader — keeps the render
  // body pure for React Compiler. Used as a fallback when the
  // conversation is still active and has no ended_at.
  const nowMs = Date.now()
  const supabase = await createSupabaseServerClient()
  const [convQ, msgQ, usageQ] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, user_id, persona_id, title, topic, status, started_at, ended_at, overall_score, interaction_mode, current_phase, scenario_variant, analysis_summary, timing_metrics, domain_id, scenario_id, starter_prompt_id, created_at"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select(
        "id, role, content, sequence, created_at, response_time_ms, metadata, analysis"
      )
      .eq("conversation_id", id)
      .order("sequence", { ascending: true })
      .limit(500),
    supabase
      .from("ai_usage")
      .select(
        "id, task_type, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_cents, latency_ms, created_at"
      )
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
  ])

  if (convQ.error) throw new Error(convQ.error.message)
  if (!convQ.data) return null

  const [personaQ, userQ, domainQ, scenarioQ] = await Promise.all([
    supabase
      .from("personas")
      .select("id, name, persona_type")
      .eq("id", convQ.data.persona_id)
      .maybeSingle(),
    supabase
      .from("admin_users_overview")
      .select("id, email, display_name")
      .eq("id", convQ.data.user_id)
      .maybeSingle(),
    convQ.data.domain_id
      ? supabase
          .from("coaching_domains")
          .select("id, name, slug")
          .eq("id", convQ.data.domain_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    convQ.data.scenario_id
      ? supabase
          .from("scenarios")
          .select("id, name, slug, difficulty_level")
          .eq("id", convQ.data.scenario_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  return {
    conv: convQ.data,
    persona: personaQ.data,
    user: userQ.data,
    domain: domainQ.data,
    scenario: scenarioQ.data,
    messages: (msgQ.data ?? []) as Message[],
    usage: (usageQ.data ?? []) as UsageRow[],
    nowMs,
  }
}

export default async function ConversationViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
  const { id } = await params
  const data = await loadConversation(id)
  if (!data) notFound()

  const totalCost = data.usage.reduce(
    (n, r) => n + (r.estimated_cost_cents ?? 0),
    0
  )
  const totalTokens = data.usage.reduce(
    (n, r) => n + (r.total_tokens ?? 0),
    0
  )
  const totalPromptTokens = data.usage.reduce(
    (n, r) => n + (r.prompt_tokens ?? 0),
    0
  )
  const totalCompletionTokens = data.usage.reduce(
    (n, r) => n + (r.completion_tokens ?? 0),
    0
  )

  // Latency stats over chat-task rows
  const chatLatencies = data.usage
    .filter((u) => u.task_type === "chat" && typeof u.latency_ms === "number")
    .map((u) => u.latency_ms as number)
    .sort((a, b) => a - b)
  const p50 =
    chatLatencies.length > 0
      ? chatLatencies[Math.floor(chatLatencies.length * 0.5)]
      : null
  const p95 =
    chatLatencies.length > 0
      ? chatLatencies[
          Math.min(
            chatLatencies.length - 1,
            Math.floor(chatLatencies.length * 0.95)
          )
        ]
      : null

  // Per-model breakdown
  const perModel = new Map<
    string,
    { calls: number; tokens: number; cost: number }
  >()
  for (const u of data.usage) {
    const key = u.model ?? "(unknown)"
    const cur = perModel.get(key) ?? { calls: 0, tokens: 0, cost: 0 }
    cur.calls += 1
    cur.tokens += u.total_tokens ?? 0
    cur.cost += u.estimated_cost_cents ?? 0
    perModel.set(key, cur)
  }
  const modelBreakdown = Array.from(perModel.entries())
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.cost - a.cost)

  // Per-task breakdown
  const perTask = new Map<
    string,
    { calls: number; tokens: number; cost: number }
  >()
  for (const u of data.usage) {
    const key = u.task_type ?? "(unknown)"
    const cur = perTask.get(key) ?? { calls: 0, tokens: 0, cost: 0 }
    cur.calls += 1
    cur.tokens += u.total_tokens ?? 0
    cur.cost += u.estimated_cost_cents ?? 0
    perTask.set(key, cur)
  }
  const taskBreakdown = Array.from(perTask.entries())
    .map(([task, v]) => ({ task, ...v }))
    .sort((a, b) => b.cost - a.cost)

  // Duration
  const startedMs = data.conv.started_at
    ? new Date(data.conv.started_at).getTime()
    : data.conv.created_at
      ? new Date(data.conv.created_at).getTime()
      : null
  const endedMs = data.conv.ended_at
    ? new Date(data.conv.ended_at).getTime()
    : null
  const lastMsgMs =
    data.messages.length > 0 && data.messages[data.messages.length - 1].created_at
      ? new Date(
          data.messages[data.messages.length - 1].created_at as string
        ).getTime()
      : null
  const durationMs =
    startedMs != null
      ? (endedMs ?? lastMsgMs ?? data.nowMs) - startedMs
      : null
  const userMsgCount = data.messages.filter((m) => m.role === "user").length
  const assistantMsgCount = data.messages.filter(
    (m) => m.role === "assistant"
  ).length

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/conversations" />}
        >
          <ArrowLeft className="mr-1 size-4" /> Back to conversations
        </Button>
      </div>

      <PageHeader
        title={data.conv.title || `Conversation ${id.slice(0, 8)}…`}
        description={[
          data.persona?.name ?? "(unknown persona)",
          data.user?.display_name || data.user?.email || "(no user)",
          data.conv.status,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)] xl:items-start">
        {/* Left half: KPIs + (details+performance) | AI calls.
            Wrapped in a single column of the outer grid so it stops at
            ~⅔ of the page width and the right column (tabs) can claim
            the full vertical space from the top. */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Messages"
              value={data.messages.length.toLocaleString()}
              hint={`${userMsgCount} user · ${assistantMsgCount} assistant`}
            />
            <Kpi
              label="AI calls"
              value={data.usage.length.toLocaleString()}
              hint={`${totalTokens.toLocaleString()} tokens`}
            />
            <Kpi
              label="Spend"
              value={`$${(totalCost / 100).toFixed(3)}`}
              hint={`${totalPromptTokens.toLocaleString()} in · ${totalCompletionTokens.toLocaleString()} out`}
            />
            <Kpi
              label="Duration"
              value={durationMs == null ? "—" : formatDuration(durationMs)}
              hint={
                data.conv.ended_at
                  ? `ended ${new Date(data.conv.ended_at).toLocaleString()}`
                  : "in progress"
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversation details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm">
              <Detail label="Conversation ID" mono>
                {id}
              </Detail>
              <Detail label="Persona">
                {data.persona ? (
                  <Link
                    href={`/admin/personas/${data.conv.persona_id}`}
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    {data.persona.name}{" "}
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">unknown</span>
                )}
                {data.persona?.persona_type ? (
                  <span className="text-muted-foreground ml-2 text-[10px] tracking-wide uppercase">
                    {data.persona.persona_type}
                  </span>
                ) : null}
              </Detail>
              <Detail label="User">
                {data.user ? (
                  <Link
                    href={`/admin/users/${data.conv.user_id}`}
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    {data.user.display_name || data.user.email}{" "}
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">
                    {data.conv.user_id}
                  </span>
                )}
              </Detail>
              <Detail label="Domain">
                {data.domain?.name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </Detail>
              <Detail label="Scenario">
                {data.scenario ? (
                  <span>
                    {data.scenario.name}
                    {data.scenario.difficulty_level != null ? (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (difficulty {data.scenario.difficulty_level})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Detail>
              <Detail label="Topic">
                {data.conv.topic ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </Detail>
              <Detail label="Interaction mode">
                <Pill>{data.conv.interaction_mode ?? "—"}</Pill>
              </Detail>
              <Detail label="Current phase">
                <Pill>{data.conv.current_phase ?? "—"}</Pill>
              </Detail>
              <Detail label="Status">
                <Pill
                  tone={data.conv.status === "active" ? "active" : "muted"}
                >
                  {data.conv.status ?? "—"}
                </Pill>
              </Detail>
              <Detail label="Overall score">
                {data.conv.overall_score == null
                  ? "—"
                  : `${data.conv.overall_score}/100`}
              </Detail>
              <Detail label="Started">
                {data.conv.started_at
                  ? new Date(data.conv.started_at).toLocaleString()
                  : "—"}
              </Detail>
              <Detail label="Ended">
                {data.conv.ended_at
                  ? new Date(data.conv.ended_at).toLocaleString()
                  : "—"}
              </Detail>
              {data.conv.scenario_variant ? (
                <Detail label="Scenario variant">
                  <pre className="bg-muted overflow-auto rounded p-2 text-[11px]">
                    {JSON.stringify(data.conv.scenario_variant, null, 2)}
                  </pre>
                </Detail>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Chat-task latency only (excludes greetings and reports).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Chat p50">
                {p50 == null ? "—" : `${p50}ms`}
              </Detail>
              <Detail label="Chat p95">
                {p95 == null ? "—" : `${p95}ms`}
              </Detail>
              <Detail label="Sample size">
                {chatLatencies.length.toLocaleString()}
              </Detail>
              <Detail label="Models used">
                {modelBreakdown.length}
              </Detail>
            </dl>

            <div className="mt-4 space-y-1.5">
              <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
                By model
              </div>
              {modelBreakdown.length === 0 ? (
                <div className="text-muted-foreground text-xs">
                  No data
                </div>
              ) : (
                modelBreakdown.map((m) => (
                  <div
                    key={m.model}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate font-mono">{m.model}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {m.calls} · ${(m.cost / 100).toFixed(3)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
                By task
              </div>
              {taskBreakdown.length === 0 ? (
                <div className="text-muted-foreground text-xs">
                  No data
                </div>
              ) : (
                taskBreakdown.map((t) => (
                  <div
                    key={t.task}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span>{t.task}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {t.calls} · ${(t.cost / 100).toFixed(3)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

            </div>

            <Card>
              <CardHeader>
                <CardTitle>AI calls</CardTitle>
            <CardDescription>
              Per-request usage from the chat function.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="max-h-[800px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task / Model</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Latency</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.usage.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-8 text-center text-sm"
                      >
                        No AI calls.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.usage.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">
                          <div>{u.task_type ?? "—"}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            {u.model ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          <div>
                            {(u.total_tokens ?? 0).toLocaleString()}
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {(u.prompt_tokens ?? 0).toLocaleString()}/
                            {(u.completion_tokens ?? 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {u.latency_ms == null ? "—" : `${u.latency_ms}ms`}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          ${((u.estimated_cost_cents ?? 0) / 100).toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <ConversationTabs
            messageBubbles={
              data.messages.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No messages.
                </p>
              ) : (
                data.messages.map((m) => <MessageRow key={m.id} m={m} />)
              )
            }
            report={(data.conv.analysis_summary as SessionReportPayload | null) ?? null}
            timing={(data.conv.timing_metrics as TimingMetrics | null) ?? null}
            reportMessages={data.messages.map<ReportMessage>((m) => ({
              role: m.role,
              content: m.content,
              response_time_ms: m.response_time_ms,
              metadata: m.metadata,
            }))}
          />
        </div>
      </section>
    </div>
  )
}

type AnalysisItemType =
  | "fallacy"
  | "bias"
  | "gender_dynamic"
  | "racial_assumption"
  | "emotional"
  | "strength"
type AnalysisSeverity = "minor" | "moderate" | "significant"
type AnalysisItem = {
  type: AnalysisItemType
  code: string
  label: string
  severity: AnalysisSeverity
  excerpt: string
  explanation: string
  coaching: string
}
type AnalysisResult = {
  items: AnalysisItem[]
  overall_quality: number
  encouragement: string
}

const ANALYSIS_LABELS: Record<AnalysisItemType, string> = {
  fallacy: "Logical fallacy",
  bias: "Cognitive bias",
  gender_dynamic: "Gender dynamic",
  racial_assumption: "Cultural assumption",
  emotional: "Emotional reasoning",
  strength: "Strength",
}
const ANALYSIS_TINTS: Record<AnalysisItemType, string> = {
  fallacy: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  bias: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  gender_dynamic:
    "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  racial_assumption:
    "border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  emotional:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  strength:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
}

function MessageRow({ m }: { m: Message }) {
  const meta = m.metadata as
    | { emotional_stage?: { number?: number; name?: string } }
    | null
  const stage = meta?.emotional_stage
  const analysis = m.analysis as AnalysisResult | null

  // Layout: user on the right, assistant on the left, system centred.
  // Bubbles cap at ~75% width so even long messages preserve the
  // conversational shape rather than spanning the full card.
  const isUser = m.role === "user"
  const isSystem = m.role !== "user" && m.role !== "assistant"

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 max-w-[80%] rounded-md border border-amber-500/30 px-3 py-2 text-xs">
          <div className="text-muted-foreground mb-0.5 text-[10px] tracking-wide uppercase">
            {m.role} · #{m.sequence}
            {m.created_at
              ? ` · ${new Date(m.created_at).toLocaleTimeString()}`
              : ""}
          </div>
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      </div>
    )
  }

  const bubbleCls = isUser
    ? "bg-blue-500/15 border-blue-500/30 text-foreground"
    : "bg-emerald-500/10 border-emerald-500/25 text-foreground"
  const align = isUser ? "items-end" : "items-start"
  const metaAlign = isUser ? "text-right" : "text-left"

  return (
    <div className={`flex flex-col gap-1 ${align}`}>
      <div
        className={`max-w-[75%] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${bubbleCls}`}
      >
        {m.content}
      </div>
      <div
        className={`text-muted-foreground flex max-w-[75%] flex-wrap gap-x-2 text-[10px] tracking-wide uppercase ${metaAlign}`}
      >
        <span>
          {m.role} · #{m.sequence}
        </span>
        {m.created_at ? (
          <span>{new Date(m.created_at).toLocaleTimeString()}</span>
        ) : null}
        {m.response_time_ms != null ? (
          <span>{m.response_time_ms}ms</span>
        ) : null}
        {stage?.name ? (
          <span className="rounded bg-fuchsia-500/15 px-1.5 text-fuchsia-700 dark:text-fuchsia-300">
            stage {stage.number}: {stage.name}
          </span>
        ) : null}
      </div>
      {analysis &&
      (analysis.items?.length || analysis.encouragement) ? (
        <AnalysisCard analysis={analysis} alignRight={isUser} />
      ) : null}
    </div>
  )
}

/** Mirror of the mobile <AnalysisCard /> — same data shape (per-message
 * `analysis` JSON), same intent: show the user the quality score, the
 * encouragement, and each item (strength / fallacy / bias / etc.) with
 * its label + severity + excerpt + explanation + coaching guidance.
 * Renders under the user bubble; the goal is admin <-> user parity so
 * we can debug what each user is actually seeing. */
function AnalysisCard({
  analysis,
  alignRight,
}: {
  analysis: AnalysisResult
  alignRight: boolean
}) {
  const score = analysis.overall_quality ?? 0
  const scoreCls =
    score >= 75
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
  return (
    <div
      className={`bg-muted/40 max-w-[75%] rounded-md border p-2.5 text-xs ${
        alignRight ? "self-end" : "self-start"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
          Coaching analysis
        </span>
        <span className={`text-xs font-semibold tabular-nums ${scoreCls}`}>
          {score}/100
        </span>
      </div>
      {analysis.encouragement ? (
        <p className="text-foreground/90 mb-2 italic">
          {analysis.encouragement}
        </p>
      ) : null}
      {analysis.items?.length ? (
        <ul className="space-y-1.5">
          {analysis.items.map((item, idx) => (
            <li
              key={`${item.code}-${idx}`}
              className={`rounded-md border px-2 py-1.5 ${ANALYSIS_TINTS[item.type] ?? ""}`}
            >
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[10px] font-bold tracking-wide uppercase">
                  {ANALYSIS_LABELS[item.type] ?? item.type}
                </span>
                <span className="text-[10px] opacity-75">
                  · {item.severity}
                </span>
                <span className="text-[10px] font-mono opacity-60">
                  {item.code}
                </span>
              </div>
              <div className="mt-0.5 font-medium">{item.label}</div>
              {item.excerpt ? (
                <div className="text-foreground/75 mt-1 italic">
                  &ldquo;{item.excerpt}&rdquo;
                </div>
              ) : null}
              {item.explanation ? (
                <div className="text-foreground/85 mt-1">
                  {item.explanation}
                </div>
              ) : null}
              {item.coaching ? (
                <div className="text-foreground/85 mt-1">
                  <span className="text-[10px] tracking-wide uppercase opacity-70">
                    Coaching:
                  </span>{" "}
                  {item.coaching}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Detail({
  label,
  children,
  mono,
  wide,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-xs break-all" : "text-sm"}>
        {children}
      </dd>
    </div>
  )
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "active" | "muted"
}) {
  const cls =
    tone === "active"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : tone === "muted"
        ? "border-border bg-muted text-muted-foreground"
        : "border-border bg-muted/60 text-foreground/80"
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide ${cls}`}
    >
      {children}
    </span>
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return `${m}m ${rs}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}
