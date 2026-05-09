"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/admin/page-header"

type Initial = {
  provider: string
  byGender: Record<string, string>
  allDefaultIds: string[]
}

/**
 * Editor for app_settings.ai_voice_defaults. Admins use this to:
 *   - Tweak which voice ID a fresh persona auto-picks per gender.
 *   - Add new gender rows (e.g. non_binary) without a redeploy.
 *   - Roll forward history: previously-auto-picked IDs stay in
 *     all_default_ids unless "Reset history" is toggled, so existing
 *     personas on the old default are still treated as "auto-picked"
 *     by the form (and follow gender changes) instead of being
 *     mistaken for manual overrides.
 */
export function VoiceDefaultsEditor({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [provider, setProvider] = useState(initial.provider)
  const [rows, setRows] = useState<Array<{ gender: string; voiceId: string }>>(
    () =>
      Object.entries(initial.byGender).map(([gender, voiceId]) => ({
        gender,
        voiceId,
      }))
  )
  const [resetHistory, setResetHistory] = useState(false)
  const [pending, startTransition] = useTransition()

  function updateRow(idx: number, key: "gender" | "voiceId", value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    )
  }

  function addRow() {
    setRows((prev) => [...prev, { gender: "", voiceId: "" }])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function reset() {
    setProvider(initial.provider)
    setRows(
      Object.entries(initial.byGender).map(([gender, voiceId]) => ({
        gender,
        voiceId,
      }))
    )
    setResetHistory(false)
  }

  function save() {
    // Build by_gender, dropping blank rows. Reject empty / duplicate keys.
    const byGender: Record<string, string> = {}
    for (const r of rows) {
      const g = r.gender.trim()
      const v = r.voiceId.trim()
      if (!g && !v) continue
      if (!g || !v) {
        toast.error(`Both gender and voice ID required (or remove the row)`)
        return
      }
      if (byGender[g]) {
        toast.error(`Duplicate gender: ${g}`)
        return
      }
      byGender[g] = v
    }
    if (Object.keys(byGender).length === 0) {
      toast.error("At least one gender + voice ID required")
      return
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/ai-config/voice-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.trim(),
          by_gender: byGender,
          reset_history: resetHistory,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          `Save failed — ${body?.issues?.[0]?.message ?? body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      toast.success("Voice defaults saved")
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/ai-config" />}
        >
          <ArrowLeft className="mr-1 size-4" />
          AI config
        </Button>
      </div>

      <PageHeader
        title="Voice defaults"
        description="Voice IDs used when a fresh persona is created. The form auto-picks based on gender; admins can override per-persona on the Voice & AI tab."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={pending}
            >
              <RotateCcw className="mr-1 size-4" />
              Revert
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              <Save className="mr-1 size-4" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
            <CardDescription>
              The TTS provider voice IDs belong to. Currently the only
              wired-up provider is{" "}
              <code className="bg-muted rounded px-1 py-0.5">elevenlabs</code>{" "}
              — change here only if you swap providers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-48 space-y-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="elevenlabs"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Defaults by gender</CardTitle>
            <CardDescription>
              When a persona is created with a given gender, the form
              pre-fills voice_id with the matching ID below. Switching
              gender on an existing persona swaps to the new gender&apos;s
              default — but only if the current voice_id is still on a
              default (so manual overrides are preserved).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="w-32 space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Input
                    value={row.gender}
                    onChange={(e) =>
                      updateRow(idx, "gender", e.target.value)
                    }
                    placeholder="e.g. male"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Voice ID</Label>
                  <Input
                    value={row.voiceId}
                    onChange={(e) =>
                      updateRow(idx, "voiceId", e.target.value)
                    }
                    placeholder="EXAVITQu4vr4xnSDxMaL"
                    className="font-mono text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(idx)}
                  aria-label="Remove row"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={pending}
            >
              <Plus className="mr-1 size-3.5" />
              Add gender
            </Button>
            <p className="text-muted-foreground pt-2 text-xs">
              Genders not listed here will simply leave voice_id empty when
              that gender is selected on a new persona — admin must set the
              voice ID manually.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-pick history</CardTitle>
            <CardDescription>
              The set of every voice ID this system has previously
              auto-picked. The persona editor uses this list to decide
              whether a persona&apos;s current voice_id is &quot;still on a
              default&quot; (and should follow gender changes) or was
              manually set (and should be preserved).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {initial.allDefaultIds.length === 0 ? (
                <span className="text-muted-foreground text-xs">
                  (none yet)
                </span>
              ) : (
                initial.allDefaultIds.map((id) => (
                  <span
                    key={id}
                    className="bg-muted rounded-md border px-2 py-0.5 font-mono text-[11px]"
                  >
                    {id}
                  </span>
                ))
              )}
            </div>
            <div className="flex items-start justify-between gap-4 border-t pt-3">
              <div className="flex-1 text-sm">
                <div className="font-medium">Reset history on save</div>
                <p className="text-muted-foreground text-xs">
                  When on, the saved <code>all_default_ids</code> becomes
                  exactly the values you entered above. Existing personas
                  on a removed ID will be treated as having a manual
                  override and won&apos;t auto-update on gender change.
                  Leave off in normal use — defaults to additive.
                </p>
              </div>
              <Switch
                checked={resetHistory}
                onCheckedChange={setResetHistory}
                disabled={pending}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
