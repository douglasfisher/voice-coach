"use client"

import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  SessionReport,
  hasReportContent,
  type ReportMessage,
  type SessionReportPayload,
  type TimingMetrics,
} from "./session-report"

/**
 * Middle-column tabs: "Conversation" (the message bubbles) and
 * "Analysis" (the session report — score, strengths, weaknesses,
 * timing, performance insights, emotional journey, detailed analysis).
 *
 * Tabs are a sibling to the conversation-details / AI-calls columns,
 * not nested inside the same card, so the chat scroll height stays
 * the same regardless of which tab is selected.
 */
export function ConversationTabs({
  messageBubbles,
  report,
  timing,
  reportMessages,
}: {
  messageBubbles: ReactNode
  report: SessionReportPayload | null
  timing: TimingMetrics | null
  reportMessages: ReportMessage[]
}) {
  const showAnalysis = hasReportContent(report, timing, reportMessages)
  const defaultTab = showAnalysis ? "conversation" : "conversation"

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="conversation">Conversation</TabsTrigger>
        <TabsTrigger value="analysis" disabled={!showAnalysis}>
          Analysis
          {!showAnalysis ? (
            <span className="text-muted-foreground ml-1.5 text-[10px]">
              (none)
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="conversation">
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>
              In sequence order (max 500). Roles: user / assistant / system.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[800px] space-y-3 overflow-y-auto">
            {messageBubbles}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analysis">
        {showAnalysis ? (
          <SessionReport
            report={report}
            timing={timing}
            messages={reportMessages}
          />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-12 text-center text-sm">
              No analysis yet. The report is generated when the user ends the
              session.
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
