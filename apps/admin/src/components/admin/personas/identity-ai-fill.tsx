"use client"

import { useTransition } from "react"
import { Loader2, Sparkles } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { PersonaFormValues } from "@/lib/personas/schema"

/**
 * Quick re-roll for the 11 identity fields. Fires the same endpoint as
 * the master "Generate persona" dialog but with no surrounding modal —
 * one click → fresh values. Prompt sections are untouched.
 */
export function IdentityAiFill({
  form,
}: {
  form: UseFormReturn<PersonaFormValues>
}) {
  const [pending, startTransition] = useTransition()

  function fill() {
    startTransition(async () => {
      const res = await fetch("/api/admin/ai/persona-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: form.getValues() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          `Identity fill failed — ${body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      const d = body.data as {
        name: string
        tagline: string
        cultural_background?: string
        coaching_style: string
        challenge_style: string
        warmth: number
        directness: number
        patience: number
        humor: number
        formality: number
      }
      const setOpts = { shouldDirty: true, shouldValidate: true }
      form.setValue("name", d.name, setOpts)
      form.setValue("tagline", d.tagline, setOpts)
      if (d.cultural_background) {
        form.setValue("cultural_background", d.cultural_background, setOpts)
      }
      form.setValue(
        "coaching_style",
        d.coaching_style as PersonaFormValues["coaching_style"],
        setOpts
      )
      form.setValue(
        "challenge_style",
        d.challenge_style as PersonaFormValues["challenge_style"],
        setOpts
      )
      form.setValue("warmth", d.warmth, setOpts)
      form.setValue("directness", d.directness, setOpts)
      form.setValue("patience", d.patience, setOpts)
      form.setValue("humor", d.humor, setOpts)
      form.setValue("formality", d.formality, setOpts)
      toast.success("Identity filled — review and Save changes")
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={fill}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="mr-1 size-3.5 animate-spin" />
      ) : (
        <Sparkles className="mr-1 size-3.5" />
      )}
      {pending ? "Filling…" : "AI fill"}
    </Button>
  )
}
