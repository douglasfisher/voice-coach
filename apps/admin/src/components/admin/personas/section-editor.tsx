"use client"

import { useState, useTransition } from "react"
import { Loader2, RotateCcw, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  SECTION_META,
  type SectionKey,
} from "@/lib/personas/prompt-sections"

/**
 * One card per section: title, summary, textarea, AI Write / Reset Tokens
 * actions. Calls the admin AI proxy to fill the section, optimistic UI.
 */
export function SectionEditor({
  sectionKey,
  value,
  onChange,
  onAiWrite,
  onResetTokens,
  disabled,
}: {
  sectionKey: SectionKey
  value: string
  onChange: (v: string) => void
  onAiWrite?: () => Promise<string>
  onResetTokens?: () => void
  disabled?: boolean
}) {
  const meta = SECTION_META[sectionKey]
  const [isWriting, startWrite] = useTransition()
  const [editing, setEditing] = useState(false)

  const markerOk =
    !meta.marker || value.includes(meta.marker)
  const showMarkerWarning =
    Boolean(meta.marker) && Boolean(value.trim()) && !markerOk

  function handleAi() {
    if (!onAiWrite) return
    startWrite(async () => {
      try {
        const next = await onAiWrite()
        onChange(next)
      } catch (err) {
        toast.error(
          `AI write failed — ${err instanceof Error ? err.message : "see console"}`
        )
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold tracking-tight">
            {meta.title}
          </h4>
          <p className="text-muted-foreground text-xs">{meta.summary}</p>
          {showMarkerWarning ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Missing required marker:{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {meta.marker}
              </code>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {onResetTokens ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetTokens}
              disabled={disabled}
            >
              <RotateCcw className="mr-1 size-3.5" />
              Reset tokens
            </Button>
          ) : null}
          {onAiWrite ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAi}
              disabled={disabled || isWriting}
            >
              {isWriting ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Wand2 className="mr-1 size-3.5" />
              )}
              {isWriting ? "Writing…" : "AI write"}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          className="min-h-32 font-mono text-xs"
          placeholder={
            isWriting
              ? "Generating…"
              : editing
                ? ""
                : "Empty — click 'AI write' or type to fill this section."
          }
          spellCheck={false}
        />
      </div>
    </div>
  )
}
