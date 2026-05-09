"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TIERS = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
] as const

type Tier = (typeof TIERS)[number]

/**
 * Inline tier select for /admin/users/[id]. Saves on change with
 * optimistic UI; reverts on failure. Audit logged via the PATCH route.
 */
export function TierControl({
  userId,
  currentTier,
}: {
  userId: string
  currentTier: string | null
}) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState<string>(
    currentTier ?? "free"
  )
  const [pending, startTransition] = useTransition()

  function change(next: string) {
    if (next === optimistic) return
    const previous = optimistic
    setOptimistic(next)
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(`Tier update failed — ${body?.error ?? res.status}`)
        setOptimistic(previous)
        return
      }
      toast.success(`Tier set to ${next}`)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">Tier</span>
      <Select
        value={optimistic}
        onValueChange={(v) => v && change(v as Tier)}
        disabled={pending}
      >
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIERS.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
    </div>
  )
}
