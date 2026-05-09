/**
 * Mirror of the mobile session-report screen
 * (`app/(tabs)/chat/report/[id].tsx`). Renders the same payload — TLDR,
 * score, strengths, weaknesses, derived performance insights, emotional
 * journey from message metadata, and detailed analysis — using the
 * admin's design system instead of React Native primitives.
 *
 * Data sources:
 *   - `conversations.analysis_summary` — TLDR / score / strengths / weaknesses / detailed
 *   - `conversations.timing_metrics`   — duration / exchanges / words / response timing
 *   - `messages.metadata.emotional_stage` — per-message emotional stage tags
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  MessageCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import type { ComponentType, ReactNode } from "react"

import type { SessionReport, TimingMetrics as SharedTimingMetrics } from "@dialectica/shared-types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Admin's SessionReport view tolerates missing fields because reports
 * may be partially generated (e.g. user ended early). The chat fn
 * always emits the full SessionReport shape from
 * @dialectica/shared-types; we just relax it for rendering.
 */
export type SessionReportPayload = Partial<SessionReport>

/** Re-exported to keep existing import sites working. The canonical
 * shape lives in @dialectica/shared-types. */
export type TimingMetrics = SharedTimingMetrics

/** Admin-side helper — a slimmed message shape used by the report's
 * derived performance/emotional-journey calculations. Stays local
 * because it's not a wire-format type the chat fn emits. */
export type ReportMessage = {
  role: string
  content: string
  response_time_ms: number | null
  metadata: Record<string, unknown> | null
}

const STAGE_COLOR_HEX: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#3b82f6",
}

export function SessionReport({
  report,
  timing,
  messages,
}: {
  report: SessionReportPayload | null
  timing: TimingMetrics | null
  messages: ReportMessage[]
}) {
  if (!report && !timing && messages.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Score + TLDR — top-left, the visual headline */}
      {report?.overall_score != null || report?.tldr ? (
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4" /> Overall score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report?.overall_score != null ? (
              <ScoreBlock score={report.overall_score} />
            ) : null}
            {report?.tldr ? (
              <div>
                <div className="text-muted-foreground mb-1 text-[11px] tracking-wide uppercase">
                  Summary
                </div>
                <p className="text-sm leading-6">{report.tldr}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Session stats (timing) */}
      {timing ? <SessionStatsCard timing={timing} /> : null}

      {/* Performance analysis (derived insights) */}
      {messages.length >= 2 ? (
        <PerformanceAnalysisCard messages={messages} />
      ) : null}

      {/* Strengths */}
      {report?.strengths?.length ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="size-4" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    •
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Weaknesses */}
      {report?.weaknesses?.length ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" /> Areas for improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.weaknesses.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600 dark:text-amber-400">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Emotional journey (admin-only on mobile, but always visible here) */}
      <EmotionalJourneyCard messages={messages} />

      {/* Detailed analysis */}
      {report?.detailed_analysis ? (
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" /> Detailed analysis
            </CardTitle>
            <CardDescription>
              Long-form analysis from the report generation pass.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-7 whitespace-pre-wrap">
              {report.detailed_analysis}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ScoreBlock({ score }: { score: number }) {
  const tone = scoreTone(score)
  return (
    <div
      className={`flex flex-col items-center rounded-lg border px-4 py-5 ${tone.border} ${tone.bg}`}
    >
      <Award className={`mb-2 size-7 ${tone.text}`} />
      <div className={`text-5xl font-extrabold tabular-nums ${tone.text}`}>
        {score}
      </div>
      <div className="text-muted-foreground text-xs">out of 100</div>
      <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full ${tone.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  )
}

function scoreTone(score: number) {
  if (score >= 75) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
    }
  }
  if (score >= 50) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
    }
  }
  return {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-red-500",
  }
}

function SessionStatsCard({ timing }: { timing: TimingMetrics }) {
  const totalDuration = timing.total_duration_ms ?? 0
  const exchangeCount = timing.exchange_count ?? 0
  const userWordCount = timing.user_word_count ?? 0
  const userAvgResponse = timing.user_avg_response_ms ?? 0
  const aiAvgResponse =
    timing.ai_avg_response_ms ?? timing.assistant_avg_response_ms ?? 0

  const durationMin = totalDuration / 60_000
  const wpm = durationMin > 0 ? Math.round(userWordCount / durationMin) : 0
  const avgWordsPerResp =
    exchangeCount > 0 ? Math.round(userWordCount / exchangeCount) : 0
  // Same engagement formula as mobile so admin sees the same number.
  const engagement = Math.min(
    100,
    Math.round(
      (Math.min(avgWordsPerResp, 50) / 50) * 50 +
        (Math.min(userAvgResponse, 60_000) / 60_000) * 50
    )
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" /> Session stats
        </CardTitle>
        <CardDescription>
          Timing & engagement signals from the user&rsquo;s side.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-md border border-blue-500/30 p-3 text-center">
          <div className="text-blue-700 dark:text-blue-400 text-[10px] tracking-wider uppercase">
            Session duration
          </div>
          <div className="font-mono text-2xl font-bold">
            {formatDuration(totalDuration)}
          </div>
          <div className="text-muted-foreground text-xs">
            {exchangeCount} exchanges · {fmtNum(userWordCount)} words
          </div>
        </div>

        <StatRow
          icon={Clock}
          label="Avg response time"
          value={formatResponseTime(userAvgResponse)}
          sub="user"
          color="text-amber-600 dark:text-amber-400"
        />
        <StatRow
          icon={MessageCircle}
          label="Exchanges"
          value={fmtNum(exchangeCount)}
          sub="back-and-forth"
          color="text-violet-600 dark:text-violet-400"
        />
        <StatRow
          icon={FileText}
          label="User words"
          value={fmtNum(userWordCount)}
          sub={`~${avgWordsPerResp} per response`}
          color="text-pink-600 dark:text-pink-400"
        />
        <StatRow
          icon={Zap}
          label="Pace"
          value={`${wpm}`}
          sub="words / minute"
          color="text-teal-600 dark:text-teal-400"
        />
        <StatRow
          icon={TrendingUp}
          label="Engagement"
          value={`${engagement}%`}
          sub="thoughtfulness score"
          color="text-amber-600 dark:text-amber-400"
        />
        {aiAvgResponse > 0 ? (
          <StatRow
            icon={Brain}
            label="AI response time"
            value={formatResponseTime(aiAvgResponse)}
            sub="generation latency"
            color="text-blue-600 dark:text-blue-400"
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm font-semibold">{value}</div>
        {sub ? (
          <div className="text-muted-foreground text-[10px]">{sub}</div>
        ) : null}
      </div>
    </div>
  )
}

type Insight = {
  type: "positive" | "neutral" | "attention"
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
}

function PerformanceAnalysisCard({ messages }: { messages: ReportMessage[] }) {
  const insights = computeInsights(messages)
  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4" /> Performance analysis
        </CardTitle>
        <CardDescription>
          Patterns observed across the user&rsquo;s responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {insights.map((ins, i) => (
          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-md ${ins.color}`}
            >
              <ins.icon className="size-4" />
            </div>
            <div className="text-sm">
              <div className={`font-semibold ${ins.color.replace("bg-", "text-").replace("/15", "").replace("/10", "")}`}>
                {ins.title}
              </div>
              <div className="text-muted-foreground mt-0.5 leading-snug">
                {ins.description}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function computeInsights(messages: ReportMessage[]): Insight[] {
  const insights: Insight[] = []
  const userMsgs = messages.filter(
    (m) => m.role === "user" && m.response_time_ms != null
  )
  const aiMsgs = messages.filter(
    (m) => m.role === "assistant" && m.response_time_ms != null
  )

  if (userMsgs.length < 2) {
    insights.push({
      type: "neutral",
      icon: AlertCircle,
      title: "Limited data",
      description: "Need more exchanges to analyse response patterns.",
      color: "bg-muted text-muted-foreground",
    })
    return insights
  }

  const userTimes = userMsgs.map((m) => m.response_time_ms as number)
  const half = Math.floor(userTimes.length / 2)
  const firstHalfAvg = avg(userTimes.slice(0, half))
  const secondHalfAvg = avg(userTimes.slice(half))
  const timeTrendPct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

  if (timeTrendPct > 20) {
    insights.push({
      type: "positive",
      icon: Brain,
      title: "Deeper thinking",
      description: `Response time increased ${Math.round(Math.abs(timeTrendPct))}% as the conversation progressed — more thoughtful engagement.`,
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    })
  } else if (timeTrendPct < -20) {
    insights.push({
      type: "neutral",
      icon: Zap,
      title: "Quicker responses",
      description: `Responses got ${Math.round(Math.abs(timeTrendPct))}% faster over time. Could indicate disengagement.`,
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    })
  } else {
    insights.push({
      type: "neutral",
      icon: Minus,
      title: "Consistent pace",
      description: "Response time remained steady throughout the session.",
      color: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    })
  }

  // Word count trend
  const userWords = userMsgs.map((m) => countWords(m.content))
  const firstWordsAvg = avg(userWords.slice(0, half))
  const secondWordsAvg = avg(userWords.slice(half))
  const wordTrendPct =
    ((secondWordsAvg - firstWordsAvg) / firstWordsAvg) * 100

  if (wordTrendPct > 25) {
    insights.push({
      type: "positive",
      icon: TrendingUp,
      title: "Expanding responses",
      description: `Responses grew ${Math.round(Math.abs(wordTrendPct))}% longer — increasing engagement and depth.`,
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    })
  } else if (wordTrendPct < -25) {
    insights.push({
      type: "attention",
      icon: TrendingDown,
      title: "Shorter responses",
      description: `Responses got ${Math.round(Math.abs(wordTrendPct))}% shorter toward the end — possible fatigue.`,
      color: "bg-red-500/15 text-red-700 dark:text-red-300",
    })
  }

  if (aiMsgs.length > 0) {
    const aiAvg = avg(aiMsgs.map((m) => m.response_time_ms as number))
    insights.push({
      type: "neutral",
      icon: Zap,
      title: "AI response speed",
      description: `Average AI response: ${formatResponseTime(aiAvg)} (thinking + generation).`,
      color: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    })
  }

  const maxUserTime = Math.max(...userTimes)
  const minUserTime = Math.min(...userTimes)
  if (maxUserTime > 60_000) {
    insights.push({
      type: "positive",
      icon: Brain,
      title: "Deep reflection moment",
      description: `User took ${formatResponseTime(maxUserTime)} on one response — genuine contemplation.`,
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    })
  }
  if (minUserTime < 3_000 && userMsgs.length > 2) {
    insights.push({
      type: "attention",
      icon: Clock,
      title: "Quick response",
      description: `Fastest response was ${formatResponseTime(minUserTime)}. Quick replies may miss nuance.`,
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    })
  }

  return insights
}

function EmotionalJourneyCard({ messages }: { messages: ReportMessage[] }) {
  const stages: { number: number; name: string }[] = []
  for (const m of messages) {
    if (m.role !== "assistant" || !m.metadata) continue
    const stage = (m.metadata as { emotional_stage?: { number?: number; name?: string } })
      .emotional_stage
    if (stage && typeof stage.number === "number" && stage.name) {
      stages.push({ number: stage.number, name: stage.name })
    }
  }
  if (stages.length === 0) return null

  const start = stages[0]
  const end = stages[stages.length - 1]
  const delta = end.number - start.number
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendLabel =
    delta > 0
      ? `Warmed up (+${delta})`
      : delta < 0
        ? `Cooled down (${delta})`
        : "Stayed flat"
  const trendCls =
    delta > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta < 0
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400"

  const counts: Record<number, number> = {}
  for (const s of stages) counts[s.number] = (counts[s.number] ?? 0) + 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4" /> Emotional journey
        </CardTitle>
        <CardDescription>
          Per-message emotional stage tags from the AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <StageBubble n={start.number} name={start.name} size="md" />
          <span className="text-muted-foreground text-2xl">→</span>
          <StageBubble n={end.number} name={end.name} size="md" />
        </div>
        <div
          className={`flex items-center justify-center gap-1.5 text-sm font-semibold ${trendCls}`}
        >
          <TrendIcon className="size-4" />
          {trendLabel}
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
            Stage distribution
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {Object.entries(counts)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([num, count]) => (
                <div
                  key={num}
                  style={{
                    flex: count,
                    backgroundColor: STAGE_COLOR_HEX[Number(num)] ?? "#666",
                  }}
                />
              ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
            {Object.entries(counts)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([num, count]) => (
                <div key={num} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: STAGE_COLOR_HEX[Number(num)] ?? "#666",
                    }}
                  />
                  <span className="text-muted-foreground">
                    Stage {num}: {count}×
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
            Timeline
          </div>
          <div className="flex flex-wrap gap-1">
            {stages.map((s, i) => (
              <span
                key={i}
                title={`#${i + 1}: ${s.number} — ${formatStageName(s.name)}`}
                className="grid size-4 place-items-center rounded-full text-[8px] font-bold text-white"
                style={{
                  backgroundColor: STAGE_COLOR_HEX[s.number] ?? "#666",
                }}
              >
                {s.number}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StageBubble({
  n,
  name,
  size,
}: {
  n: number
  name: string
  size: "sm" | "md"
}) {
  const dim = size === "md" ? "size-10 text-base" : "size-7 text-xs"
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`grid ${dim} place-items-center rounded-full font-bold text-white`}
        style={{ backgroundColor: STAGE_COLOR_HEX[n] ?? "#666" }}
      >
        {n}
      </div>
      <span className="text-muted-foreground max-w-20 text-center text-[10px] leading-tight">
        {formatStageName(name)}
      </span>
    </div>
  )
}

function formatStageName(name: string): string {
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
}

function fmtNum(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString()
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "0:00"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0)
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
  return `${seconds}s`
}

function formatResponseTime(ms: number): string {
  if (!ms) return "—"
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s % 60)}s`
}

// Local helper exported so the page can decide whether to render at all.
export function hasReportContent(
  report: SessionReportPayload | null,
  timing: TimingMetrics | null,
  messages: ReportMessage[]
): boolean {
  if (report?.tldr || report?.overall_score != null) return true
  if (report?.strengths?.length || report?.weaknesses?.length) return true
  if (report?.detailed_analysis) return true
  if (timing?.total_duration_ms || timing?.exchange_count) return true
  if (messages.some((m) => m.metadata && (m.metadata as { emotional_stage?: unknown }).emotional_stage)) {
    return true
  }
  return false
}

export type SessionReportProps = ReactNode
