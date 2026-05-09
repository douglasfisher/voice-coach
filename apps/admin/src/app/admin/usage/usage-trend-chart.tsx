"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Datum = { day: string; cost_usd: number }

/**
 * Daily AI spend trend. Recharts AreaChart with one series. Theme-aware
 * via CSS variables (--primary) so light/dark both look right.
 */
export function UsageTrendChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No spend in the last 30 days.
      </div>
    )
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="usage-grad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--primary)"
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={(v: string) => v.slice(5)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(v) => [`$${Number(v).toFixed(4)}`, "Spend"]}
            labelFormatter={(v) => String(v)}
          />
          <Area
            type="monotone"
            dataKey="cost_usd"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#usage-grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
