/**
 * Compact 5-bar personality summary for table rows. Each bar is a 0–100
 * trait — fill width tracks the value. Tooltip shows the numeric values.
 */
export function PersonalityBars({
  warmth,
  directness,
  patience,
  humor,
  formality,
}: {
  warmth: number | null | undefined
  directness: number | null | undefined
  patience: number | null | undefined
  humor: number | null | undefined
  formality: number | null | undefined
}) {
  const traits = [
    { label: "W", title: "Warmth", value: warmth ?? 0 },
    { label: "D", title: "Directness", value: directness ?? 0 },
    { label: "P", title: "Patience", value: patience ?? 0 },
    { label: "H", title: "Humor", value: humor ?? 0 },
    { label: "F", title: "Formality", value: formality ?? 0 },
  ]
  return (
    <div
      className="flex items-end gap-1"
      title={traits.map((t) => `${t.title}: ${t.value}`).join(" · ")}
      aria-label={traits.map((t) => `${t.title} ${t.value}`).join(", ")}
    >
      {traits.map((t) => (
        <div key={t.label} className="flex flex-col items-center gap-1">
          <div className="bg-muted relative h-8 w-2 overflow-hidden rounded-full">
            <div
              className="bg-primary/80 absolute right-0 bottom-0 left-0"
              style={{ height: `${Math.max(2, t.value)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-[9px] leading-none font-medium">
            {t.label}
          </span>
        </div>
      ))}
    </div>
  )
}
