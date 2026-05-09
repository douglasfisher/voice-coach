"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Budget = {
  id: string
  name: string
  limit_cents: number
  alert_threshold_percent: number | null
  is_active: boolean | null
  notify_on_threshold: boolean | null
  notify_on_exceeded: boolean | null
}

/**
 * Inline form for one ai_budgets row. Editable fields: name, limit
 * (dollars), alert threshold (%), active flag, notify-on-threshold,
 * notify-on-exceeded. Saves via PATCH /api/admin/budgets/[id].
 */
export function BudgetEditor({ budget }: { budget: Budget }) {
  const router = useRouter()
  const [name, setName] = useState(budget.name)
  const [limitDollars, setLimitDollars] = useState(
    (budget.limit_cents / 100).toFixed(2)
  )
  const [alertPct, setAlertPct] = useState(
    budget.alert_threshold_percent ?? 80
  )
  const [active, setActive] = useState(budget.is_active ?? true)
  const [notifyThreshold, setNotifyThreshold] = useState(
    budget.notify_on_threshold ?? true
  )
  const [notifyExceeded, setNotifyExceeded] = useState(
    budget.notify_on_exceeded ?? true
  )
  const [pending, startTransition] = useTransition()

  function save() {
    const cents = Math.round(Number(limitDollars) * 100)
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Limit must be a non-negative number")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/budgets/${budget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          limit_cents: cents,
          alert_threshold_percent: alertPct,
          is_active: active,
          notify_on_threshold: notifyThreshold,
          notify_on_exceeded: notifyExceeded,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          `Save failed — ${body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      toast.success("Budget updated")
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Limit (USD)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={limitDollars}
            onChange={(e) => setLimitDollars(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Alert threshold (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={alertPct}
            onChange={(e) => setAlertPct(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <Toggle
          label="Active"
          checked={active}
          onChange={setActive}
          disabled={pending}
        />
        <Toggle
          label="Notify at threshold"
          checked={notifyThreshold}
          onChange={setNotifyThreshold}
          disabled={pending}
        />
        <Toggle
          label="Notify when exceeded"
          checked={notifyExceeded}
          onChange={setNotifyExceeded}
          disabled={pending}
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          <Save className="mr-1 size-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      {label}
    </label>
  )
}
