"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

/**
 * Clickable Active / Inactive pill. Single-click flips the state via the
 * dedicated activate endpoint — no confirm because the change is reversible.
 *
 * Uses stopPropagation so clicks don't bubble to the row-wide navigate
 * link beneath it.
 */
export function ActiveToggle({
  personaId,
  personaName,
  isActive,
}: {
  personaId: string
  personaName: string
  isActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function flip(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/personas/${personaId}/active`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !isActive }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(
          `Toggle failed — ${body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      toast.success(
        `${personaName} ${isActive ? "deactivated" : "activated"}`
      )
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending}
      aria-pressed={isActive}
      title={isActive ? "Click to deactivate" : "Click to activate"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        "disabled:cursor-wait disabled:opacity-60",
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 hover:bg-zinc-500/20 dark:text-zinc-400"
      )}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {isActive ? "Active" : "Inactive"}
    </button>
  )
}
