"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Save, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

/**
 * Free-text admin notes editor with debounced auto-save.
 *
 * Behaviour:
 * - Saves 1500ms after the last keystroke (long enough to not flood
 *   the audit log; short enough that admins don't lose unsaved work
 *   if they navigate away).
 * - Manual "Save now" button bypasses the debounce.
 * - Status pill shows idle / saving / saved (clears after 2s).
 * - Every save writes an admin_audit_log entry (user.notes.update).
 *   Empty notes are stored as null so we distinguish "cleared" from
 *   "never set".
 */
export function AdminNotesEditor({
  userId,
  initialNotes,
}: {
  userId: string
  initialNotes: string | null
}) {
  const [value, setValue] = useState(initialNotes ?? "")
  const [savedValue, setSavedValue] = useState(initialNotes ?? "")
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function save(next: string) {
    startTransition(async () => {
      setStatus("saving")
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(`Save failed — ${body?.error ?? res.status}`)
        setStatus("idle")
        return
      }
      setSavedValue(next)
      setStatus("saved")
      if (savedClearRef.current) clearTimeout(savedClearRef.current)
      savedClearRef.current = setTimeout(() => setStatus("idle"), 2000)
    })
  }

  // Debounced auto-save on every change.
  useEffect(() => {
    if (value === savedValue) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(value), 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // save is stable enough; intentionally no-deps to skip lints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, savedValue])

  const dirty = value !== savedValue

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Admin notes</CardTitle>
          <CardDescription>
            Free-text scratchpad — context for other admins. Saves 1.5s
            after the last keystroke. Every save is audit-logged.
          </CardDescription>
        </div>
        <StatusPill status={status} dirty={dirty} />
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Verified ID over Slack 2026-04-12. Duplicate of doug@…"
          rows={5}
          maxLength={10_000}
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {value.length} / 10,000
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              save(value)
            }}
            disabled={!dirty || pending}
          >
            <Save className="mr-1 size-3.5" />
            Save now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPill({
  status,
  dirty,
}: {
  status: "idle" | "saving" | "saved"
  dirty: boolean
}) {
  if (status === "saving") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    )
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="size-3" /> Saved
      </span>
    )
  }
  if (dirty) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        Unsaved changes
      </span>
    )
  }
  return null
}
