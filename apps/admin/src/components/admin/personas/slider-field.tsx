"use client"

import { Slider } from "@/components/ui/slider"

/**
 * Reusable labelled slider that integrates with react-hook-form by accepting
 * a controlled value + onChange. Shows the live numeric value to the right.
 */
export function SliderField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
}: {
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  format?: (value: number) => string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
        <span className="font-mono text-sm tabular-nums">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v
          onChange(typeof next === "number" ? next : min)
        }}
      />
    </div>
  )
}
