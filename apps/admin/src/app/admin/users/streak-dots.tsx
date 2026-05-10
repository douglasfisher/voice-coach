/**
 * Per-user activity sparkline. Renders one dot per day in the window;
 * filled if the user was active that day, hollow otherwise. Today is
 * the right-most dot.
 *
 * "Active that day" = at least one ai_usage row stamped with that
 * date. Computed once per page render (single query) by the parent.
 *
 * Pure-render server component. The dot strip is keyboard-friendly
 * via the title attribute on each circle (hover/focus shows the
 * date in browser tooltip; useful for picking out gaps).
 */
export function StreakDots({
  days,
  activeDates,
  today,
}: {
  days: number
  activeDates: Set<string> | null
  today: Date
}) {
  // Build the date list right-to-left (today, yesterday, ...) then
  // reverse so today is the right-most dot. Use ISO YYYY-MM-DD as the
  // key — matches how we slice ai_usage.created_at server-side.
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const dots = dates.map((iso) => ({
    iso,
    active: activeDates?.has(iso) ?? false,
  }))

  // No data at all → row of empty placeholders. Avoids a layout shift
  // when the supplementary query returns nothing for this user.
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Activity over ${days} days`}
    >
      {dots.map((d) => (
        <span
          key={d.iso}
          title={d.iso + (d.active ? " · active" : " · no activity")}
          className={
            d.active
              ? "size-1.5 rounded-full bg-emerald-500"
              : "size-1.5 rounded-full border border-muted-foreground/30 bg-transparent"
          }
        />
      ))}
    </div>
  )
}
