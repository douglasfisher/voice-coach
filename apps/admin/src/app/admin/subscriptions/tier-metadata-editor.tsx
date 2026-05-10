"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Save, Eye, EyeOff } from "lucide-react"
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
import type { Database } from "@/types/database"

type TierMetadata = Database["public"]["Tables"]["tier_metadata"]["Row"]

/**
 * One card per tier, with editable display + commercial fields.
 * Commercial fields (price, visibility) are read-only when the actor
 * isn't superadmin — UI matches the server's enforcement rule so users
 * don't see save errors after editing.
 *
 * Save is per-tier (one PATCH per dirty card). Saving a single tier is
 * usually faster + cleaner than a "save all" bulk button when admins
 * are tweaking copy — most edits touch one tier at a time.
 */
export function TierMetadataEditor({
  metas,
  canEditCommercial,
}: {
  metas: TierMetadata[]
  canEditCommercial: boolean
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {metas.map((m) => (
        <TierCard
          key={m.tier}
          initial={m}
          canEditCommercial={canEditCommercial}
        />
      ))}
    </div>
  )
}

function TierCard({
  initial,
  canEditCommercial,
}: {
  initial: TierMetadata
  canEditCommercial: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState(initial)

  const dirty =
    draft.display_name !== initial.display_name ||
    draft.short_description !== initial.short_description ||
    draft.marketing_description !== initial.marketing_description ||
    draft.monthly_price_cents !== initial.monthly_price_cents ||
    draft.annual_price_cents !== initial.annual_price_cents ||
    draft.badge_color !== initial.badge_color ||
    draft.is_visible_in_pricing !== initial.is_visible_in_pricing ||
    draft.sort_order !== initial.sort_order

  function set<K extends keyof TierMetadata>(key: K, value: TierMetadata[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      const body: Record<string, unknown> = {}
      if (draft.display_name !== initial.display_name)
        body.display_name = draft.display_name
      if (draft.short_description !== initial.short_description)
        body.short_description = draft.short_description
      if (draft.marketing_description !== initial.marketing_description)
        body.marketing_description = draft.marketing_description
      if (draft.badge_color !== initial.badge_color)
        body.badge_color = draft.badge_color
      if (draft.sort_order !== initial.sort_order)
        body.sort_order = draft.sort_order
      // Commercial only included if changed AND allowed
      if (canEditCommercial) {
        if (draft.monthly_price_cents !== initial.monthly_price_cents)
          body.monthly_price_cents = draft.monthly_price_cents
        if (draft.annual_price_cents !== initial.annual_price_cents)
          body.annual_price_cents = draft.annual_price_cents
        if (draft.is_visible_in_pricing !== initial.is_visible_in_pricing)
          body.is_visible_in_pricing = draft.is_visible_in_pricing
      }

      const res = await fetch(`/api/admin/tier-metadata/${draft.tier}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const respBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Save failed — ${respBody?.error ?? res.status}`)
        return
      }
      toast.success(`Saved ${draft.display_name}`)
      router.refresh()
    })
  }

  return (
    <Card
      className="border-l-4"
      style={
        draft.badge_color
          ? { borderLeftColor: draft.badge_color }
          : undefined
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: draft.badge_color ?? "#6B7280" }}
              />
              {draft.display_name}
              {!draft.is_visible_in_pricing ? (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <EyeOff className="size-3" /> hidden
                </span>
              ) : null}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              tier: {draft.tier}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || pending}
            onClick={save}
          >
            <Save className="mr-1 size-3.5" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Display name</Label>
            <Input
              value={draft.display_name ?? ""}
              onChange={(e) => set("display_name", e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sort order</Label>
            <Input
              type="number"
              value={draft.sort_order ?? 0}
              onChange={(e) =>
                set("sort_order", Number(e.target.value) || 0)
              }
              min={0}
              max={1000}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Short description</Label>
          <Input
            value={draft.short_description ?? ""}
            onChange={(e) => set("short_description", e.target.value || null)}
            maxLength={200}
            placeholder="One line summary for the pricing card"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Marketing description</Label>
          <Textarea
            rows={3}
            value={draft.marketing_description ?? ""}
            onChange={(e) =>
              set("marketing_description", e.target.value || null)
            }
            maxLength={2000}
            placeholder="Longer copy for the pricing page hero"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Monthly $</Label>
            <Input
              type="number"
              step="0.01"
              value={
                draft.monthly_price_cents == null
                  ? ""
                  : (draft.monthly_price_cents / 100).toFixed(2)
              }
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") {
                  set("monthly_price_cents", null)
                } else {
                  const n = Number(raw)
                  if (Number.isFinite(n)) {
                    set("monthly_price_cents", Math.round(n * 100))
                  }
                }
              }}
              disabled={!canEditCommercial}
              placeholder="custom"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Annual $</Label>
            <Input
              type="number"
              step="0.01"
              value={
                draft.annual_price_cents == null
                  ? ""
                  : (draft.annual_price_cents / 100).toFixed(2)
              }
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") {
                  set("annual_price_cents", null)
                } else {
                  const n = Number(raw)
                  if (Number.isFinite(n)) {
                    set("annual_price_cents", Math.round(n * 100))
                  }
                }
              }}
              disabled={!canEditCommercial}
              placeholder="custom"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Badge colour</Label>
            <Input
              value={draft.badge_color ?? ""}
              onChange={(e) => set("badge_color", e.target.value || null)}
              placeholder="#6B7280"
              pattern="#[0-9a-fA-F]{6}"
              maxLength={7}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Visible in pricing</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEditCommercial}
            onClick={() =>
              set("is_visible_in_pricing", !draft.is_visible_in_pricing)
            }
          >
            {draft.is_visible_in_pricing ? (
              <>
                <Eye className="mr-1 size-3.5" /> Visible
              </>
            ) : (
              <>
                <EyeOff className="mr-1 size-3.5" /> Hidden
              </>
            )}
          </Button>
        </div>

        {!canEditCommercial ? (
          <p className="text-muted-foreground text-[10px]">
            Price + visibility changes require superadmin.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
