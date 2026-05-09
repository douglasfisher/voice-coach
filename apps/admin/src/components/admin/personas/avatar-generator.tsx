"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Check,
  Crop,
  Dice5,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AvatarConfig, AvatarOptions } from "@/lib/avatars/config"
import {
  toggleAccessory,
  type AvatarParams,
} from "@/lib/avatars/constants"

import { AvatarCropper } from "./avatar-cropper"
import { CompositionOverlay } from "./composition-overlay"

function buildPromptFromTemplate(
  template: string,
  params: AvatarParams
): string {
  const accessoriesText = params.accessories
    .filter((a) => a !== "none")
    .join(", ")
  const accessoriesPart = accessoriesText
    ? `wearing ${accessoriesText}`
    : "no accessories"
  return template
    .replaceAll("{{age_range}}", params.age_range)
    .replaceAll("{{appearance}}", params.appearance)
    .replaceAll("{{ethnicity}}", params.ethnicity)
    .replaceAll("{{gender}}", params.gender)
    .replaceAll("{{expression}}", params.expression)
    .replaceAll("{{clothing}}", params.clothing)
    .replaceAll("{{accessories}}", accessoriesPart)
    .replaceAll("{{pose}}", params.pose)
    .replaceAll("{{lighting}}", params.lighting)
    .replaceAll("{{camera}}", params.camera)
}

function randomFromOptions(options: AvatarOptions, gender?: string): AvatarParams {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T
  return {
    gender: (gender ?? pick(options.gender)) as AvatarParams["gender"],
    age_range: pick(options.age_range) as AvatarParams["age_range"],
    ethnicity: pick(options.ethnicity) as AvatarParams["ethnicity"],
    appearance: pick(options.appearance) as AvatarParams["appearance"],
    lighting: pick(options.lighting) as AvatarParams["lighting"],
    clothing: pick(options.clothing) as AvatarParams["clothing"],
    expression: pick(options.expression) as AvatarParams["expression"],
    accessories: ["none"] as AvatarParams["accessories"],
    pose: pick(options.pose) as AvatarParams["pose"],
    camera: pick(options.camera) as AvatarParams["camera"],
  }
}

type Draft = {
  id: string
  url: string
  storagePath: string
  cost?: number
}

export type AvatarGeneratorValue = {
  avatar_url: string
  avatar_thumbnail_url: string | null
  avatar_params: {
    params: AvatarParams
    prompt: string
  } | null
}

/**
 * End-to-end avatar generation matching the mobile wizard:
 *
 *   1. Pick parameters → assemble a prompt (editable)
 *   2. Generate 4 drafts via runware (model `runware:400@1`, 896x1152)
 *   3. Select one draft
 *   4. Upscale to a photoreal 1792x2400 hi-res via Google Imagen
 *   5. Hi-res becomes avatar_url; the selected draft becomes the thumbnail
 *
 * State stays local until the parent form is saved, mirroring the wizard.
 */
export function AvatarGenerator({
  config,
  initial,
  initialGenderHint,
  onChange,
}: {
  config: AvatarConfig
  initial: AvatarGeneratorValue
  initialGenderHint?: AvatarParams["gender"]
  onChange: (next: AvatarGeneratorValue) => void
}) {
  const options = config.options
  // Seed from previously-saved avatar params if the persona has them; fall
  // through to global defaults otherwise. This is what makes tweak-and-
  // regenerate cycles painless — the form opens at the previous run.
  const [params, setParams] = useState<AvatarParams>(() => {
    const saved = initial.avatar_params?.params
    if (saved) {
      return {
        ...options.defaults,
        ...saved,
      } as AvatarParams
    }
    return {
      ...options.defaults,
      gender: (initialGenderHint ?? options.defaults.gender) as AvatarParams["gender"],
    }
  })
  // null = "use the prompt derived from params"; non-null = user-edited
  // (or restored from a saved hand-edited prompt).
  const [userPrompt, setUserPrompt] = useState<string | null>(() => {
    const savedPrompt = initial.avatar_params?.prompt
    if (!savedPrompt) return null
    // Only treat the saved prompt as "edited" if it differs from what
    // params alone would produce. Otherwise leave it derived so updating
    // a parameter immediately re-derives the prompt.
    const savedParams = initial.avatar_params?.params
    if (!savedParams) return savedPrompt
    const derived = buildPromptFromTemplate(
      config.draft.promptTemplate,
      savedParams as AvatarParams
    )
    return savedPrompt === derived ? null : savedPrompt
  })
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [hiResUrl, setHiResUrl] = useState<string | null>(
    initial.avatar_url || null
  )
  const [isGenerating, startGenerate] = useTransition()
  const [isUpscaling, startUpscale] = useTransition()
  const [showOverlay, setShowOverlay] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)

  const derivedPrompt = useMemo(
    () => buildPromptFromTemplate(config.draft.promptTemplate, params),
    [config.draft.promptTemplate, params]
  )
  const prompt = userPrompt ?? derivedPrompt
  const promptEdited = userPrompt !== null

  const selectedDraft = useMemo(
    () => drafts.find((d) => d.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId]
  )

  function update<K extends keyof AvatarParams>(
    key: K,
    value: AvatarParams[K]
  ) {
    setParams((p) => ({ ...p, [key]: value }))
  }

  function randomize() {
    const next = randomFromOptions(options, params.gender)
    setParams(next)
    setUserPrompt(null)
  }

  function generate() {
    setDrafts([])
    setSelectedDraftId(null)
    startGenerate(async () => {
      const res = await fetch("/api/admin/avatars/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, params }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Generate failed — ${body?.message ?? body?.error ?? res.status}`)
        return
      }
      setDrafts(body.data?.drafts ?? [])
      toast.success(`${body.data?.drafts?.length ?? 0} drafts ready`)
    })
  }

  /**
   * Upscale either the original selected draft or an already-cropped URL.
   * The thumbnail stays as the original draft URL so list views still
   * show the small concept image while the hi-res is the photoreal version.
   */
  function upscaleFromUrl(referenceUrl: string) {
    if (!selectedDraft) return
    return new Promise<void>((resolve) => {
      startUpscale(async () => {
        const res = await fetch("/api/admin/avatars/upscale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftUrl: referenceUrl }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(
            `Upscale failed — ${body?.message ?? body?.error ?? res.status}`
          )
          return resolve()
        }
        const url = body.data?.url as string | undefined
        if (!url) {
          toast.error("Upscale returned no image")
          return resolve()
        }
        setHiResUrl(url)
        onChange({
          avatar_url: url,
          avatar_thumbnail_url: selectedDraft.url,
          avatar_params: { params, prompt },
        })
        toast.success("Photoreal avatar ready and applied")
        resolve()
      })
    })
  }

  function upscaleDirectly() {
    if (!selectedDraft) return
    upscaleFromUrl(selectedDraft.url)
  }

  function applyDraftDirectly(d: Draft) {
    onChange({
      avatar_url: d.url,
      avatar_thumbnail_url: d.url,
      avatar_params: { params, prompt },
    })
    toast.success("Draft applied as avatar (no upscale)")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Parameter form */}
      <section className="space-y-5">
        <Header
          icon={Sparkles}
          title="Concept"
          subtitle="Pick parameters or edit the prompt directly. Same model and dimensions as the mobile app."
        />

        <div className="grid grid-cols-2 gap-3">
          <ParamSelect
            label="Gender"
            value={params.gender}
            onChange={(v) => update("gender", v as AvatarParams["gender"])}
            options={options.gender}
          />
          <ParamSelect
            label="Age range"
            value={params.age_range}
            onChange={(v) =>
              update("age_range", v as AvatarParams["age_range"])
            }
            options={options.age_range}
          />
        </div>
        <ParamSelect
          label="Ethnicity"
          value={params.ethnicity}
          onChange={(v) => update("ethnicity", v as AvatarParams["ethnicity"])}
          options={options.ethnicity}
        />
        <ParamSelect
          label="Appearance"
          value={params.appearance}
          onChange={(v) =>
            update("appearance", v as AvatarParams["appearance"])
          }
          options={options.appearance}
        />
        <div className="grid grid-cols-2 gap-3">
          <ParamSelect
            label="Lighting"
            value={params.lighting}
            onChange={(v) =>
              update("lighting", v as AvatarParams["lighting"])
            }
            options={options.lighting}
          />
          <ParamSelect
            label="Clothing"
            value={params.clothing}
            onChange={(v) =>
              update("clothing", v as AvatarParams["clothing"])
            }
            options={options.clothing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ParamSelect
            label="Expression"
            value={params.expression}
            onChange={(v) =>
              update("expression", v as AvatarParams["expression"])
            }
            options={options.expression}
          />
          <ParamSelect
            label="Pose"
            value={params.pose}
            onChange={(v) => update("pose", v as AvatarParams["pose"])}
            options={options.pose}
          />
        </div>
        <ParamSelect
          label="Camera"
          value={params.camera}
          onChange={(v) => update("camera", v as AvatarParams["camera"])}
          options={options.camera}
        />

        {/* Accessories — multi-select chips */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Accessories</div>
          <div className="flex flex-wrap gap-1.5">
            {options.accessories.map((opt) => {
              const selected = params.accessories.includes(
                opt as AvatarParams["accessories"][number]
              )
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    update(
                      "accessories",
                      toggleAccessory(
                        params.accessories,
                        opt as AvatarParams["accessories"][number]
                      )
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  )}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt textarea — editable, derived by default */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Prompt</div>
            {promptEdited ? (
              <button
                type="button"
                onClick={() => setUserPrompt(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Reset to params
              </button>
            ) : null}
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="min-h-32 font-mono text-xs"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={generate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1 size-4" />
            )}
            {isGenerating ? "Generating…" : "Generate 4 drafts"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={randomize}
            disabled={isGenerating}
          >
            <Dice5 className="mr-1 size-4" />
            Randomize
          </Button>
        </div>
      </section>

      {/* Right column: drafts + hi-res preview */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Upload className="text-primary size-4" />
              <h3 className="text-sm font-semibold tracking-tight">Drafts</h3>
            </div>
            <p className="text-muted-foreground text-xs">
              Pick the best concept, then crop or upscale to photoreal.
            </p>
          </div>
          {drafts.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOverlay((v) => !v)}
              title="Toggle composition overlay"
            >
              {showOverlay ? (
                <EyeOff className="mr-1 size-3.5" />
              ) : (
                <Eye className="mr-1 size-3.5" />
              )}
              {showOverlay ? "Hide composition" : "Show composition"}
            </Button>
          ) : null}
        </div>

        {drafts.length === 0 && !isGenerating ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(isGenerating ? Array.from({ length: 4 }) : drafts).map(
              (d, i) => {
                if (!d) return <SkeletonTile key={`skel-${i}`} />
                const draft = d as Draft
                const isSelected = selectedDraftId === draft.id
                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => setSelectedDraftId(draft.id)}
                    className={cn(
                      "group relative aspect-[896/1152] overflow-hidden rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary ring-primary/40 ring-2"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.url}
                      alt={`Draft ${i + 1}`}
                      className="size-full object-cover"
                    />
                    {showOverlay ? (
                      <CompositionOverlay
                        svg={config.composition.silhouetteSvg}
                        opacity={0.4}
                        className="text-amber-300"
                      />
                    ) : null}
                    {isSelected ? (
                      <div className="bg-primary text-primary-foreground absolute top-2 right-2 grid size-6 place-items-center rounded-full">
                        <Check className="size-3.5" strokeWidth={3} />
                      </div>
                    ) : null}
                  </button>
                )
              }
            )}
          </div>
        )}

        {drafts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setCropOpen(true)}
              disabled={!selectedDraft || isUpscaling}
            >
              <Crop className="mr-1 size-4" />
              Crop & upscale
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={upscaleDirectly}
              disabled={!selectedDraft || isUpscaling}
            >
              {isUpscaling ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-4" />
              )}
              {isUpscaling ? "Upscaling…" : "Upscale directly"}
            </Button>
            {selectedDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyDraftDirectly(selectedDraft)}
                disabled={isUpscaling}
              >
                Use draft as-is
              </Button>
            ) : null}
            {!selectedDraft ? (
              <span className="text-muted-foreground text-xs">
                Select a draft to continue
              </span>
            ) : null}
          </div>
        ) : null}

        {hiResUrl ? (
          <div className="space-y-2 pt-2">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Hi-res result
            </div>
            <div className="bg-muted overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hiResUrl}
                alt="Hi-res avatar"
                className="aspect-[1792/2400] size-full object-cover"
              />
            </div>
            <p className="text-muted-foreground text-xs break-all">
              {hiResUrl}
            </p>
          </div>
        ) : null}
      </section>

      <AvatarCropper
        open={cropOpen}
        onOpenChange={setCropOpen}
        draftUrl={selectedDraft?.url ?? null}
        silhouetteSvg={config.composition.silhouetteSvg}
        targetAspect={config.composition.targetAspect}
        onApply={async (croppedUrl) => {
          await upscaleFromUrl(croppedUrl)
        }}
      />
    </div>
  )
}

// --- helpers ---------------------------------------------------------------

function Header({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <div className="space-y-0.5 border-b pb-3">
      <div className="flex items-center gap-2">
        <Icon className="text-primary size-4" />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
    </div>
  )
}

function ParamSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v != null) onChange(v)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SkeletonTile() {
  return (
    <div className="bg-muted aspect-[896/1152] animate-pulse rounded-lg" />
  )
}

function EmptyState() {
  return (
    <div className="text-muted-foreground bg-muted/30 grid aspect-[896/1152] place-items-center rounded-lg border border-dashed text-center text-xs">
      <div>
        <div className="mb-1 font-medium">No drafts yet</div>
        <div>Click &quot;Generate 4 drafts&quot; to start</div>
      </div>
    </div>
  )
}
