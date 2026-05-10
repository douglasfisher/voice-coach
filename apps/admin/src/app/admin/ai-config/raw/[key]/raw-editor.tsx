"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Save, RotateCcw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

/**
 * Generic JSON editor for app_settings rows that don't have a typed
 * editor yet. The whole row is replaced on save.
 *
 * Safety nets:
 * - Validates JSON parses before enabling save.
 * - Renders a parse-error message inline when the textarea is invalid.
 * - Reset button reverts to the server's last-loaded value (saved or
 *   not).
 * - Audit log captures the full before/after on every save so a bad
 *   edit is recoverable.
 */
export function RawJsonEditor({
  configKey,
  initialValue,
  updatedAt,
}: {
  configKey: string
  initialValue: unknown
  updatedAt: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const initialText = useMemo(
    () => JSON.stringify(initialValue, null, 2),
    [initialValue]
  )
  const [text, setText] = useState(initialText)

  const parsed = useMemo<{ ok: true; value: unknown } | { ok: false; error: string }>(() => {
    try {
      return { ok: true, value: JSON.parse(text) }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }, [text])

  const dirty = text !== initialText
  const canSave = dirty && parsed.ok && !pending

  function reset() {
    setText(initialText)
  }

  function save() {
    if (!parsed.ok || !dirty) return
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/ai-config/raw/${encodeURIComponent(configKey)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: parsed.value }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Save failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success("Saved")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">{configKey}</CardTitle>
        <CardDescription>
          Raw <code>app_settings.value</code> (JSONB). The full value is
          replaced on save.{" "}
          {updatedAt
            ? `Last saved ${new Date(updatedAt).toLocaleString()}.`
            : "Never saved through this UI."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(40, Math.max(12, text.split("\n").length + 2))}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder="{}"
        />
        {parsed.ok ? (
          <p className="text-muted-foreground text-xs">
            Valid JSON · {text.length.toLocaleString()} characters
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3.5" />
            Invalid JSON: {parsed.error}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!dirty || pending}
          onClick={reset}
        >
          <RotateCcw className="mr-1 size-3.5" />
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={save}
        >
          <Save className="mr-1 size-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  )
}
