"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/admin/page-header"
import { CompositionOverlay } from "@/components/admin/personas/composition-overlay"
import type {
  AvatarComposition,
  AvatarSafeZone,
} from "@/lib/avatars/composition"

const SAFE_ZONE_FIELDS: Array<{
  key: keyof AvatarSafeZone
  label: string
}> = [
  { key: "head_top_pct", label: "Head top %" },
  { key: "head_height_pct", label: "Head height %" },
  { key: "head_width_pct", label: "Head width %" },
  { key: "horizontal_center_pct", label: "Horizontal centre %" },
  { key: "shoulders_top_pct", label: "Shoulders top %" },
  { key: "shoulders_height_pct", label: "Shoulders height %" },
]

/**
 * Live editor for app_settings.ai_avatar_composition. Two columns:
 *   - Left: target aspect, safe-zone numeric inputs, SVG textarea
 *   - Right: live preview using the same CompositionOverlay component the
 *     drafts panel uses, so what you see here is exactly what shows up
 *     on persona drafts.
 *
 * On save: PATCH /api/admin/ai-config/avatar-composition. Form values are
 * the source of truth; the preview re-renders on every keystroke.
 */
export function CompositionEditor({
  initial,
}: {
  initial: AvatarComposition
}) {
  const router = useRouter()
  const [aspect, setAspect] = useState(initial.targetAspect)
  const [svg, setSvg] = useState(initial.silhouetteSvg)
  const [safeZone, setSafeZone] = useState<AvatarSafeZone>(initial.safeZone)
  const [pending, startTransition] = useTransition()

  function setSafeZoneField(key: keyof AvatarSafeZone, value: number) {
    setSafeZone((prev) => ({ ...prev, [key]: value }))
  }

  function reset() {
    setAspect(initial.targetAspect)
    setSvg(initial.silhouetteSvg)
    setSafeZone(initial.safeZone)
  }

  function save() {
    startTransition(async () => {
      const res = await fetch(
        "/api/admin/ai-config/avatar-composition",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_aspect: aspect,
            silhouette_svg: svg,
            safe_zone: safeZone,
          }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const issue = body?.issues?.[0]?.message
        toast.error(
          `Save failed — ${issue ?? body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      toast.success("Composition saved")
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
        title="Avatar composition"
        description="Silhouette + safe-zone overlay shown on persona draft previews and inside the crop modal. Change here is live for all generations."
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frame</CardTitle>
              <CardDescription>
                Aspect ratio of the persona display tile. Crop modal locks to
                this.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-32 space-y-1.5">
                <Label htmlFor="aspect">Aspect ratio</Label>
                <Input
                  id="aspect"
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value)}
                  placeholder="3:4"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safe zone</CardTitle>
              <CardDescription>
                Percentages of the frame describing where the head and
                shoulders should land. Used by future tools to validate
                generated drafts; the silhouette SVG below should reflect
                these numbers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {SAFE_ZONE_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={safeZone[key]}
                    onChange={(e) =>
                      setSafeZoneField(key, Number(e.target.value))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Silhouette SVG</CardTitle>
              <CardDescription>
                Single <code className="bg-muted rounded px-1 py-0.5">{`<svg>`}</code>{" "}
                document. Use{" "}
                <code className="bg-muted rounded px-1 py-0.5">
                  stroke=&quot;currentColor&quot;
                </code>{" "}
                so theming works. Sanitised on render with DOMPurify (svg
                profile) — script, event handlers and external refs are
                stripped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={svg}
                onChange={(e) => setSvg(e.target.value)}
                className="min-h-72 font-mono text-xs"
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                Same overlay component used on persona drafts. Edits update
                instantly; nothing is saved until you click Save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border">
                {/* Placeholder face area — a neutral gradient so the
                    silhouette's amber stroke reads clearly. */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 70% at 50% 38%, rgba(255,255,255,0.18), rgba(0,0,0,0))",
                  }}
                />
                <CompositionOverlay
                  svg={svg}
                  opacity={0.85}
                  className="text-amber-300"
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                ViewBox of the SVG should match the aspect ratio above —
                e.g. for 3:4 use{" "}
                <code className="bg-muted rounded px-1 py-0.5">
                  viewBox=&quot;0 0 100 133.33&quot;
                </code>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
