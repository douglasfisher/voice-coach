"use client"

import { useState, useTransition } from "react"
import { Loader2, Sparkles } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { AvatarConfig } from "@/lib/avatars/config"
import { insertMissingTokens } from "@/lib/personas/constants"
import {
  PERSONA_TYPES,
  type PersonaType,
} from "@/lib/personas/constants"
import {
  compileSections,
  defaultTraitTokensSection,
} from "@/lib/personas/prompt-sections"
import type { PersonaFormValues } from "@/lib/personas/schema"

/**
 * Master "Generate persona" dialog.
 *
 * Five pre-flight selects (gender, type, age, ethnicity, appearance) feed
 * a `constraints` block sent to /api/admin/ai/persona-details. The AI is
 * instructed to respect them; the server enforces the avatar fields
 * server-side regardless of what the model returned. The persona-details
 * response also includes a complete avatar block which we apply to
 * `form.avatar_params` so the Avatar tab pre-fills with values matching
 * the new persona — the user can then click "Generate 4 drafts" to render
 * the matching face.
 */

// Sentinel value passed to the Select primitive when the user picks "Any"
// (i.e. no constraint). Distinct from valid option values so it can't
// collide. The label shown in the UI is "Any" — the sentinel never reaches
// the AI because we strip it in buildConstraintsPayload().
const ANY_VALUE = "__any__"

type ConstraintState = {
  gender: "male" | "female" | "any"
  persona_type: PersonaType | "any"
  age_range: string
  ethnicity: string
  appearance: string
}

type DetailsResponse = {
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
  persona_type: PersonaType | null
  avatar?: {
    gender: string
    age_range: string
    ethnicity: string
    appearance: string
    lighting: string
    clothing: string
    expression: string
    accessories: string[]
    pose: string
    camera: string
  }
}

export function GeneratePersonaDialog({
  form,
  open,
  onOpenChange,
  avatarConfig,
}: {
  form: UseFormReturn<PersonaFormValues>
  open: boolean
  onOpenChange: (next: boolean) => void
  avatarConfig: AvatarConfig
}) {
  const [concept, setConcept] = useState("")
  const [doIdentity, setDoIdentity] = useState(true)
  const [doSections, setDoSections] = useState(true)
  const [doCompile, setDoCompile] = useState(true)
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)

  // Defaults: prefer values already on the form. For ethnicity/appearance
  // (which only live on the avatar block) fall through to the saved
  // avatar_params, then to app_settings.ai_avatar_options.defaults so the
  // dialog opens at sensible values rather than empty selects.
  const formGender = form.watch("gender")
  const formType = form.watch("persona_type")
  const formAge = form.watch("age_range") ?? ""
  const savedAvatarParams = form.watch("avatar_params")
  const optDefaults = avatarConfig.options.defaults
  const [constraints, setConstraints] = useState<ConstraintState>({
    gender:
      formGender === "male" || formGender === "female" ? formGender : "any",
    persona_type: formType ?? "any",
    age_range: formAge || optDefaults.age_range,
    ethnicity:
      savedAvatarParams?.params?.ethnicity ?? optDefaults.ethnicity,
    appearance:
      savedAvatarParams?.params?.appearance ?? optDefaults.appearance,
  })

  function updateConstraint<K extends keyof ConstraintState>(
    key: K,
    value: ConstraintState[K]
  ) {
    setConstraints((c) => ({ ...c, [key]: value }))
  }

  function snapshot(): PersonaFormValues {
    return form.getValues() as PersonaFormValues
  }

  async function fetchJson<T>(
    url: string,
    body: unknown
  ): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        message: json?.message ?? json?.error ?? `HTTP ${res.status}`,
      }
    }
    return { ok: true, data: json.data as T }
  }

  function applyDetails(d: DetailsResponse) {
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

    // Persona type — only if a constraint was set (server echoes it back).
    if (d.persona_type) {
      form.setValue("persona_type", d.persona_type, setOpts)
    }

    // Avatar params — apply if the AI returned the avatar block. This is
    // what makes the next "Generate 4 drafts" produce a face matching the
    // generated persona description.
    if (d.avatar) {
      const a = d.avatar
      form.setValue(
        "avatar_params",
        {
          params: {
            gender: a.gender,
            age_range: a.age_range,
            ethnicity: a.ethnicity,
            appearance: a.appearance,
            lighting: a.lighting,
            clothing: a.clothing,
            expression: a.expression,
            accessories: a.accessories,
            pose: a.pose,
            camera: a.camera,
          },
          // Cleared — the avatar generator will rebuild the prompt from
          // the new params on next render.
          prompt: "",
        },
        setOpts
      )
      // Mirror gender + age_range to the identity-tab fields so the form
      // stays internally consistent.
      if (a.gender === "male" || a.gender === "female") {
        form.setValue(
          "gender",
          a.gender as PersonaFormValues["gender"],
          setOpts
        )
      }
      if (a.age_range) form.setValue("age_range", a.age_range, setOpts)
    }
  }

  function buildConstraintsPayload() {
    return {
      gender: constraints.gender === "any" ? undefined : constraints.gender,
      persona_type:
        constraints.persona_type === "any"
          ? undefined
          : constraints.persona_type,
      age_range: constraints.age_range || undefined,
      ethnicity: constraints.ethnicity || undefined,
      appearance: constraints.appearance || undefined,
    }
  }

  function generate() {
    startTransition(async () => {
      let okCount = 0
      let failed = false

      if (doIdentity) {
        setProgress("Writing identity + matching avatar…")
        const r = await fetchJson<DetailsResponse>(
          "/api/admin/ai/persona-details",
          {
            form: snapshot(),
            concept: concept.trim() || undefined,
            constraints: buildConstraintsPayload(),
          }
        )
        if (!r.ok) {
          toast.error(`Identity failed — ${r.message}`)
          failed = true
        } else {
          applyDetails(r.data)
          okCount++
        }
      }

      if (!failed && doSections) {
        const sections = {
          identity: "",
          trait_tokens: defaultTraitTokensSection(),
          character_traits: "",
          roleplay_behavior: "",
          coaching_approach: "",
        } as PersonaFormValues["prompt_sections"] extends infer T ? T : never

        const aiKeys = [
          "identity",
          "character_traits",
          "roleplay_behavior",
          "coaching_approach",
        ] as const

        for (const key of aiKeys) {
          setProgress(`Writing ${key.replace(/_/g, " ")}…`)
          const r = await fetchJson<{ content: string }>(
            "/api/admin/ai/section",
            { key, form: snapshot() }
          )
          if (!r.ok) {
            toast.error(`Section ${key} failed — ${r.message}`)
            failed = true
            break
          }
          ;(sections as Record<string, string>)[key] = r.data.content
          const prev = snapshot().prompt_sections ?? {
            identity: "",
            trait_tokens: "",
            character_traits: "",
            roleplay_behavior: "",
            coaching_approach: "",
          }
          form.setValue(
            "prompt_sections",
            { ...prev, ...sections },
            { shouldDirty: true, shouldValidate: true }
          )
          okCount++
        }
      }

      if (!failed && doCompile) {
        setProgress("Compiling system prompt…")
        const sections = snapshot().prompt_sections
        if (sections) {
          const compiled = insertMissingTokens(compileSections(sections))
          form.setValue("system_prompt", compiled, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      }

      setProgress(null)
      if (!failed) {
        toast.success(
          `Generated ${okCount} step${okCount === 1 ? "" : "s"} — review, generate avatar drafts, and Save changes`
        )
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate persona</DialogTitle>
          <DialogDescription>
            Optionally constrain the persona with the selects below, then
            describe the concept. The AI generates identity fields plus
            matching avatar parameters — click <em>Generate 4 drafts</em>{" "}
            on the Avatar tab afterwards to render the face. Nothing is
            saved until you click <em>Save changes</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SelectField
              label="Gender"
              value={constraints.gender}
              onChange={(v) =>
                updateConstraint("gender", v as ConstraintState["gender"])
              }
              options={[
                { value: "any", label: "Any" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
              disabled={pending}
            />
            <SelectField
              label="Type"
              value={constraints.persona_type}
              onChange={(v) =>
                updateConstraint(
                  "persona_type",
                  v as ConstraintState["persona_type"]
                )
              }
              options={[
                { value: "any", label: "Any" },
                ...PERSONA_TYPES.map((t) => ({ value: t, label: t })),
              ]}
              disabled={pending}
            />
            <SelectField
              label="Age range"
              value={constraints.age_range || ANY_VALUE}
              onChange={(v) =>
                updateConstraint(
                  "age_range",
                  v === ANY_VALUE ? "" : v
                )
              }
              options={[
                { value: ANY_VALUE, label: "Any" },
                ...avatarConfig.options.age_range.map((v) => ({
                  value: v,
                  label: v,
                })),
              ]}
              disabled={pending}
            />
            <SelectField
              label="Ethnicity"
              value={constraints.ethnicity || ANY_VALUE}
              onChange={(v) =>
                updateConstraint(
                  "ethnicity",
                  v === ANY_VALUE ? "" : v
                )
              }
              options={[
                { value: ANY_VALUE, label: "Any" },
                ...avatarConfig.options.ethnicity.map((e) => ({
                  value: e,
                  label: e,
                })),
              ]}
              disabled={pending}
            />
            <SelectField
              label="Appearance"
              value={constraints.appearance || ANY_VALUE}
              onChange={(v) =>
                updateConstraint(
                  "appearance",
                  v === ANY_VALUE ? "" : v
                )
              }
              options={[
                { value: ANY_VALUE, label: "Any" },
                ...avatarConfig.options.appearance.map((a) => ({
                  value: a,
                  label: a,
                })),
              ]}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="concept">Concept (optional)</Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. tough-love negotiator with a New York edge"
              className="min-h-20 text-sm"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Free-text hint appended to the prompt. Combined with the
              selects above for fine control.
            </p>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <Toggle
              checked={doIdentity}
              disabled={pending}
              onCheckedChange={setDoIdentity}
              label="Fill identity + avatar params"
              hint="Name, tagline, styles, sliders, and matching avatar parameters."
            />
            <Toggle
              checked={doSections}
              disabled={pending}
              onCheckedChange={setDoSections}
              label="Write all 5 prompt sections"
              hint="identity, trait tokens, character traits, roleplay behavior, coaching approach."
            />
            <Toggle
              checked={doCompile}
              disabled={pending}
              onCheckedChange={setDoCompile}
              label="Compile final system prompt"
              hint="Joins sections, inserts any missing trait tokens."
            />
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {progress ? (
            <p className="text-muted-foreground mr-auto text-xs">
              {progress}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={generate}
            disabled={pending || (!doIdentity && !doSections && !doCompile)}
          >
            {pending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-4" />
            )}
            {pending ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Toggle({
  checked,
  disabled,
  onCheckedChange,
  label,
  hint,
}: {
  checked: boolean
  disabled: boolean
  onCheckedChange: (next: boolean) => void
  label: string
  hint: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 text-sm">
        <div className="font-medium">{label}</div>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v != null) onChange(v)
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
