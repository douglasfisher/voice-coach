"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TRAIT_TOKENS, getMissingTokens } from "@/lib/personas/constants"

export function TraitTokenBadges({
  systemPrompt,
  onInsertMissing,
}: {
  systemPrompt: string
  onInsertMissing?: () => void
}) {
  const missing = getMissingTokens(systemPrompt)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TRAIT_TOKENS.map((token) => {
          const present = systemPrompt.includes(`{{${token}}}`)
          return (
            <span
              key={token}
              className={
                present
                  ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                  : "rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-rose-700 dark:text-rose-400"
              }
            >
              {`{{${token}}}`}
            </span>
          )
        })}
      </div>
      {missing.length > 0 && onInsertMissing ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onInsertMissing}
          className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
        >
          <Plus className="mr-1 size-3.5" />
          Insert {missing.length} missing token{missing.length === 1 ? "" : "s"}
        </Button>
      ) : null}
    </div>
  )
}
