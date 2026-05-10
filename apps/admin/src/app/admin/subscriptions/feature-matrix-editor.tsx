"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Save, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Database } from "@/types/database"

type FeatureFlag = Database["public"]["Tables"]["feature_flags"]["Row"]
type TierMetadata = Database["public"]["Tables"]["tier_metadata"]["Row"]
type TierFeature = Database["public"]["Tables"]["tier_features"]["Row"]

type Tier = TierFeature["tier"]
type FeatureValue = boolean | number | null

const TIER_ORDER: readonly Tier[] = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
]
const TIER_RANK: Record<Tier, number> = {
  free: 0,
  freemium: 1,
  basic: 2,
  pro: 3,
  enterprise: 4,
  team: 5,
}

/** Decode the JSONB-encoded value column into our union type. */
function decodeValue(raw: unknown): FeatureValue {
  if (raw === null) return null
  if (typeof raw === "boolean") return raw
  if (typeof raw === "number") return raw
  // Defensive — schema enforces boolean | number | null but be safe.
  return null
}

/**
 * Walks free → tier last-write-wins to compute the resolved value
 * the user would see. Mirrors the resolveFeatureValue helper in
 * @dialectica/shared-types but inlined here for the cell rendering
 * loop (avoids a per-cell function-call overhead with this many cells).
 */
function resolveFor(
  flag: FeatureFlag,
  tier: Tier,
  draft: Map<string, Map<Tier, FeatureValue>>
): FeatureValue {
  const userRank = TIER_RANK[tier]
  let value: FeatureValue = decodeValue(flag.default_value)
  for (const t of TIER_ORDER) {
    if (TIER_RANK[t] > userRank) break
    const m = draft.get(flag.key)
    if (m && m.has(t)) {
      value = m.get(t) ?? null
    }
  }
  return value
}

/**
 * Whether a cell has its OWN explicit override (not just inherited).
 * Empty cells visually distinguish inherited values from set ones.
 */
function hasOwnOverride(
  feature_key: string,
  tier: Tier,
  draft: Map<string, Map<Tier, FeatureValue>>
): boolean {
  return draft.get(feature_key)?.has(tier) === true
}

export function FeatureMatrixEditor({
  flags,
  metas,
  overrides,
}: {
  flags: FeatureFlag[]
  metas: TierMetadata[]
  overrides: TierFeature[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Initial overrides indexed by feature_key → tier → value.
  const initial = useMemo(() => {
    const m = new Map<string, Map<Tier, FeatureValue>>()
    for (const o of overrides) {
      let inner = m.get(o.feature_key)
      if (!inner) {
        inner = new Map()
        m.set(o.feature_key, inner)
      }
      inner.set(o.tier, decodeValue(o.value))
    }
    return m
  }, [overrides])

  // Working copy. Same shape as initial.
  const [draft, setDraft] = useState<Map<string, Map<Tier, FeatureValue>>>(
    () => {
      const copy = new Map<string, Map<Tier, FeatureValue>>()
      for (const [k, inner] of initial) copy.set(k, new Map(inner))
      return copy
    }
  )

  /** Group flags by feature_group preserving sort_order within groups. */
  const groups = useMemo(() => {
    const map = new Map<string, FeatureFlag[]>()
    for (const f of flags) {
      const g = f.feature_group
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(f)
    }
    return Array.from(map.entries())
  }, [flags])

  /** Diff vs initial — what we'd send to the API. */
  const { upserts, deletes } = useMemo(() => {
    const upserts: { tier: Tier; feature_key: string; value: FeatureValue }[] = []
    const deletes: { tier: Tier; feature_key: string }[] = []
    // walk every cell that exists in either initial or draft
    const allKeys = new Set<string>([...initial.keys(), ...draft.keys()])
    for (const key of allKeys) {
      const initialInner = initial.get(key) ?? new Map<Tier, FeatureValue>()
      const draftInner = draft.get(key) ?? new Map<Tier, FeatureValue>()
      const allTiers = new Set<Tier>([
        ...initialInner.keys(),
        ...draftInner.keys(),
      ])
      for (const tier of allTiers) {
        const had = initialInner.has(tier)
        const has = draftInner.has(tier)
        const before = initialInner.get(tier)
        const after = draftInner.get(tier)
        if (had && !has) {
          deletes.push({ tier, feature_key: key })
        } else if (!had && has) {
          upserts.push({ tier, feature_key: key, value: after ?? null })
        } else if (had && has && before !== after) {
          upserts.push({ tier, feature_key: key, value: after ?? null })
        }
      }
    }
    return { upserts, deletes }
  }, [draft, initial])

  const dirty = upserts.length + deletes.length > 0

  function setOverride(key: string, tier: Tier, value: FeatureValue) {
    setDraft((prev) => {
      const next = new Map(prev)
      let inner = next.get(key)
      inner = inner ? new Map(inner) : new Map()
      inner.set(tier, value)
      next.set(key, inner)
      return next
    })
  }

  function clearOverride(key: string, tier: Tier) {
    setDraft((prev) => {
      const next = new Map(prev)
      const inner = next.get(key) ? new Map(next.get(key)!) : new Map()
      inner.delete(tier)
      if (inner.size === 0) next.delete(key)
      else next.set(key, inner)
      return next
    })
  }

  function reset() {
    const copy = new Map<string, Map<Tier, FeatureValue>>()
    for (const [k, inner] of initial) copy.set(k, new Map(inner))
    setDraft(copy)
  }

  function save() {
    if (!dirty) return
    startTransition(async () => {
      const res = await fetch("/api/admin/tier-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upserts, deletes }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Save failed — ${body?.error ?? res.status}`)
        return
      }
      const counts = body.data ?? { upserts: 0, deletes: 0 }
      toast.success(
        `Saved ${counts.upserts} change${counts.upserts === 1 ? "" : "s"}, ` +
          `cleared ${counts.deletes}`
      )
      router.refresh()
    })
  }

  const tierLabels = new Map(metas.map((m) => [m.tier, m.display_name]))

  return (
    <div className="space-y-3">
      <div className="bg-card sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b py-2">
        <span className="text-muted-foreground text-xs">
          {dirty
            ? `${upserts.length} change${upserts.length === 1 ? "" : "s"}, ` +
              `${deletes.length} cleared`
            : "No unsaved changes"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || pending}
            onClick={reset}
          >
            <RotateCcw className="mr-1 size-3.5" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || pending}
            onClick={save}
          >
            <Save className="mr-1 size-3.5" />
            {pending ? "Saving…" : "Save matrix"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left">
                Feature
              </th>
              {TIER_ORDER.map((tier) => (
                <th key={tier} className="px-2 py-2 text-center font-medium">
                  <div>{tierLabels.get(tier) ?? tier}</div>
                  <div className="text-muted-foreground font-mono text-[10px]">
                    {tier}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([groupName, groupFlags]) => (
              <Section
                key={groupName}
                title={groupName}
                rows={groupFlags}
                draft={draft}
                onSet={setOverride}
                onClear={clearOverride}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Section({
  title,
  rows,
  draft,
  onSet,
  onClear,
}: {
  title: string
  rows: FeatureFlag[]
  draft: Map<string, Map<Tier, FeatureValue>>
  onSet: (key: string, tier: Tier, value: FeatureValue) => void
  onClear: (key: string, tier: Tier) => void
}) {
  return (
    <>
      <tr className="bg-muted/20">
        <td
          colSpan={1 + TIER_ORDER.length}
          className="sticky left-0 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase"
        >
          {title}
        </td>
      </tr>
      {rows.map((flag) => (
        <FeatureRow
          key={flag.key}
          flag={flag}
          draft={draft}
          onSet={onSet}
          onClear={onClear}
        />
      ))}
    </>
  )
}

function FeatureRow({
  flag,
  draft,
  onSet,
  onClear,
}: {
  flag: FeatureFlag
  draft: Map<string, Map<Tier, FeatureValue>>
  onSet: (key: string, tier: Tier, value: FeatureValue) => void
  onClear: (key: string, tier: Tier) => void
}) {
  return (
    <tr className="border-t">
      <td className="bg-card sticky left-0 max-w-xs px-3 py-2">
        <div className="text-sm font-medium">{flag.name}</div>
        <div className="text-muted-foreground line-clamp-2 text-xs">
          {flag.description}
        </div>
        <div className="text-muted-foreground mt-1 font-mono text-[10px]">
          {flag.key} · {flag.kind}
        </div>
      </td>
      {TIER_ORDER.map((tier) => (
        <td key={tier} className="border-l px-2 py-2 text-center">
          <Cell
            flag={flag}
            tier={tier}
            draft={draft}
            onSet={onSet}
            onClear={onClear}
          />
        </td>
      ))}
    </tr>
  )
}

function Cell({
  flag,
  tier,
  draft,
  onSet,
  onClear,
}: {
  flag: FeatureFlag
  tier: Tier
  draft: Map<string, Map<Tier, FeatureValue>>
  onSet: (key: string, tier: Tier, value: FeatureValue) => void
  onClear: (key: string, tier: Tier) => void
}) {
  const has = hasOwnOverride(flag.key, tier, draft)
  const resolved = resolveFor(flag, tier, draft)

  if (flag.kind === "boolean") {
    const checked = resolved === true
    return (
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSet(flag.key, tier, !checked)}
          className={
            checked
              ? "bg-emerald-500 size-5 rounded text-white"
              : "border-muted-foreground/40 hover:border-muted-foreground size-5 rounded border bg-transparent"
          }
          title={
            has
              ? "Override set — click to flip"
              : "Inherited — click to set explicit override"
          }
        >
          {checked ? "✓" : ""}
        </button>
        {has ? (
          <button
            type="button"
            onClick={() => onClear(flag.key, tier)}
            className="text-muted-foreground hover:text-foreground"
            title="Clear override (revert to inherited)"
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>
    )
  }

  // Numeric: input field; null = unlimited.
  const display = resolved === null ? "" : String(resolved)
  return (
    <div className="inline-flex items-center gap-1">
      <Input
        value={display}
        placeholder={resolved === null ? "∞" : ""}
        onChange={(e) => {
          const raw = e.target.value.trim()
          if (raw === "" || raw === "∞") {
            onSet(flag.key, tier, null)
          } else {
            const n = Number(raw)
            if (Number.isFinite(n)) onSet(flag.key, tier, n)
          }
        }}
        className={
          has
            ? "h-7 w-20 text-center text-xs font-medium tabular-nums"
            : "h-7 w-20 text-muted-foreground/60 text-center text-xs italic tabular-nums"
        }
        title={
          has
            ? "Override set — empty for unlimited"
            : "Inherited — type to set explicit override"
        }
      />
      {has ? (
        <button
          type="button"
          onClick={() => onClear(flag.key, tier)}
          className="text-muted-foreground hover:text-foreground"
          title="Clear override (revert to inherited)"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  )
}
