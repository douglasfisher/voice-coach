"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { History, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type HistoryRow = {
  id: string
  persona_id: string
  edited_by: string | null
  edited_by_email: string | null
  system_prompt: string | null
  prompt_sections: unknown
  reason: string | null
  edited_at: string
}

/**
 * Prompt history tab — read-only list of prior prompt versions, newest
 * first, with a per-row Restore button. Restore POSTs to the restore
 * endpoint and refreshes the page so the form picks up the new values
 * from the server.
 */
export function PromptHistoryTab({ personaId }: { personaId: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/admin/personas/${personaId}/history`)
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
        if (!cancelled) {
          setRows((body.data ?? []) as HistoryRow[])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId])

  async function handleRestore(historyId: string) {
    setRestoringId(historyId)
    try {
      const res = await fetch(
        `/api/admin/personas/${personaId}/history/${historyId}/restore`,
        { method: "POST" }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      toast.success("Prompt restored. Reload the form to see the changes.")
      router.refresh()
    } catch (e) {
      toast.error(`Restore failed — ${e instanceof Error ? e.message : e}`)
    } finally {
      setRestoringId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
        Loading history…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive rounded-lg border py-12 text-center text-sm">
        Failed to load: {error}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> No history yet
          </CardTitle>
          <CardDescription>
            History entries are recorded automatically when you save a change to
            the system prompt or prompt sections.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-xs">
        Snapshots are taken before every save. The most recent entry is the
        version you replaced when you last saved. Restoring snapshots the
        current state first so you can roll forward again.
      </div>
      {rows.map((r) => {
        const expanded = expandedId === r.id
        return (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-sm">
                  {new Date(r.edited_at).toLocaleString()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {r.reason ?? "edit"}
                  {r.edited_by_email ? ` · ${r.edited_by_email}` : ""}
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  {expanded ? "Hide" : "View"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={restoringId !== null}
                      >
                        <RotateCcw className="mr-1 size-4" />
                        Restore
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The current system prompt + prompt sections will be
                        snapshotted to history first, then replaced with this
                        version. Reload the form afterwards to see the
                        restored values.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={restoringId !== null}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault()
                          void handleRestore(r.id)
                        }}
                        disabled={restoringId !== null}
                      >
                        {restoringId === r.id ? "Restoring…" : "Restore"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            {expanded ? (
              <CardContent>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                    System prompt
                  </div>
                  <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                    {r.system_prompt ?? "(empty)"}
                  </pre>
                </div>
                {r.prompt_sections != null ? (
                  <div className="mt-3">
                    <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                      Prompt sections
                    </div>
                    <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 text-xs">
                      {JSON.stringify(r.prompt_sections, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
