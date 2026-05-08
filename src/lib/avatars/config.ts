import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  loadAvatarComposition,
  type AvatarComposition,
} from "./composition"

import {
  ACCESSORY_OPTIONS,
  AGE_RANGE_OPTIONS,
  APPEARANCE_OPTIONS,
  CAMERA_OPTIONS,
  CLOTHING_OPTIONS,
  DEFAULT_AVATAR_PARAMS,
  ETHNICITY_OPTIONS,
  EXPRESSION_OPTIONS,
  GENDER_OPTIONS,
  LIGHTING_OPTIONS,
  POSE_OPTIONS,
  type AvatarParams,
} from "./constants"

/**
 * Avatar generation config + parameter options pulled from
 * app_settings.ai_avatar_config and app_settings.ai_avatar_options.
 *
 * The values shape is intentionally typed as plain string arrays — the
 * web client doesn't need the literal-union types since the DB is
 * the source of truth. Code that requires literals (e.g. the buildPrompt
 * helper) still uses the constant fallback.
 */
export type AvatarOptions = {
  gender: string[]
  age_range: string[]
  ethnicity: string[]
  appearance: string[]
  lighting: string[]
  clothing: string[]
  expression: string[]
  accessories: string[]
  pose: string[]
  camera: string[]
  defaults: AvatarParams
  multiSelect: string[]
  exclusiveValues: Record<string, string>
}

export type DraftConfig = {
  model: string
  width: number
  height: number
  numberResults: number
  cfgScale: number
  scheduler: string
  promptTemplate: string
  negativePrompt: string
}

export type HiResConfig = {
  model: string
  width: number
  height: number
  prompt: string
}

export type AvatarConfig = {
  options: AvatarOptions
  draft: DraftConfig
  hires: HiResConfig
  composition: AvatarComposition
}

/**
 * Defaults used when the DB row is absent or malformed. Matches what's in
 * lib/avatars/constants.ts — keep as a safety net so the editor never breaks
 * if app_settings is mid-migration. The DB always wins when present.
 */
const FALLBACK_OPTIONS: AvatarOptions = {
  gender: [...GENDER_OPTIONS],
  age_range: [...AGE_RANGE_OPTIONS],
  ethnicity: [...ETHNICITY_OPTIONS],
  appearance: [...APPEARANCE_OPTIONS],
  lighting: [...LIGHTING_OPTIONS],
  clothing: [...CLOTHING_OPTIONS],
  expression: [...EXPRESSION_OPTIONS],
  accessories: [...ACCESSORY_OPTIONS],
  pose: [...POSE_OPTIONS],
  camera: [...CAMERA_OPTIONS],
  defaults: DEFAULT_AVATAR_PARAMS,
  multiSelect: ["accessories"],
  exclusiveValues: { accessories: "none" },
}

const FALLBACK_DRAFT: DraftConfig = {
  model: "runware:400@1",
  width: 896,
  height: 1152,
  numberResults: 4,
  cfgScale: 3.5,
  scheduler: "FlowMatchEulerDiscreteScheduler",
  promptTemplate:
    "A classic mid-length head and shoulders portrait of a {{appearance}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}, {{pose}} composition, lit with {{lighting}} lighting on a dark charcoal background with space around. Shot on {{camera}}.",
  negativePrompt:
    "cartoon, anime, 3d render, distorted, blurry, low quality, text, watermark",
}

const FALLBACK_HIRES: HiResConfig = {
  model: "google:4@2",
  width: 1792,
  height: 2400,
  prompt:
    "make this is more photorealistic, with full ultra photorealistic details but keep the same pose and position in the frame",
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out = value.filter((v): v is string => typeof v === "string")
  return out.length ? out : null
}

function readOptions(raw: unknown): AvatarOptions {
  if (!raw || typeof raw !== "object") return FALLBACK_OPTIONS
  const v = raw as Record<string, unknown>
  const defaults =
    v.defaults && typeof v.defaults === "object" && !Array.isArray(v.defaults)
      ? (v.defaults as Record<string, unknown>)
      : null

  const dGet = (key: keyof AvatarParams, fallback: string) => {
    const x = defaults?.[key]
    return typeof x === "string" ? x : fallback
  }
  const dGetArr = (
    key: keyof AvatarParams,
    fallback: string[]
  ): string[] => {
    const x = defaults?.[key]
    return asStringArray(x) ?? fallback
  }

  return {
    gender: asStringArray(v.gender) ?? FALLBACK_OPTIONS.gender,
    age_range: asStringArray(v.age_range) ?? FALLBACK_OPTIONS.age_range,
    ethnicity: asStringArray(v.ethnicity) ?? FALLBACK_OPTIONS.ethnicity,
    appearance: asStringArray(v.appearance) ?? FALLBACK_OPTIONS.appearance,
    lighting: asStringArray(v.lighting) ?? FALLBACK_OPTIONS.lighting,
    clothing: asStringArray(v.clothing) ?? FALLBACK_OPTIONS.clothing,
    expression: asStringArray(v.expression) ?? FALLBACK_OPTIONS.expression,
    accessories:
      asStringArray(v.accessories) ?? FALLBACK_OPTIONS.accessories,
    pose: asStringArray(v.pose) ?? FALLBACK_OPTIONS.pose,
    camera: asStringArray(v.camera) ?? FALLBACK_OPTIONS.camera,
    defaults: {
      gender: dGet(
        "gender",
        FALLBACK_OPTIONS.defaults.gender
      ) as AvatarParams["gender"],
      age_range: dGet(
        "age_range",
        FALLBACK_OPTIONS.defaults.age_range
      ) as AvatarParams["age_range"],
      ethnicity: dGet(
        "ethnicity",
        FALLBACK_OPTIONS.defaults.ethnicity
      ) as AvatarParams["ethnicity"],
      appearance: dGet(
        "appearance",
        FALLBACK_OPTIONS.defaults.appearance
      ) as AvatarParams["appearance"],
      lighting: dGet(
        "lighting",
        FALLBACK_OPTIONS.defaults.lighting
      ) as AvatarParams["lighting"],
      clothing: dGet(
        "clothing",
        FALLBACK_OPTIONS.defaults.clothing
      ) as AvatarParams["clothing"],
      expression: dGet(
        "expression",
        FALLBACK_OPTIONS.defaults.expression
      ) as AvatarParams["expression"],
      accessories: dGetArr(
        "accessories",
        FALLBACK_OPTIONS.defaults.accessories
      ) as AvatarParams["accessories"],
      pose: dGet(
        "pose",
        FALLBACK_OPTIONS.defaults.pose
      ) as AvatarParams["pose"],
      camera: dGet(
        "camera",
        FALLBACK_OPTIONS.defaults.camera
      ) as AvatarParams["camera"],
    },
    multiSelect:
      asStringArray(v.multi_select) ?? FALLBACK_OPTIONS.multiSelect,
    exclusiveValues:
      v.exclusive_values && typeof v.exclusive_values === "object"
        ? (v.exclusive_values as Record<string, string>)
        : FALLBACK_OPTIONS.exclusiveValues,
  }
}

function readDraft(raw: unknown): DraftConfig {
  if (!raw || typeof raw !== "object") return FALLBACK_DRAFT
  const v = raw as Record<string, unknown>
  return {
    model: typeof v.model === "string" ? v.model : FALLBACK_DRAFT.model,
    width: typeof v.width === "number" ? v.width : FALLBACK_DRAFT.width,
    height: typeof v.height === "number" ? v.height : FALLBACK_DRAFT.height,
    numberResults:
      typeof v.number_results === "number"
        ? v.number_results
        : FALLBACK_DRAFT.numberResults,
    cfgScale:
      typeof v.cfg_scale === "number" ? v.cfg_scale : FALLBACK_DRAFT.cfgScale,
    scheduler:
      typeof v.scheduler === "string"
        ? v.scheduler
        : FALLBACK_DRAFT.scheduler,
    promptTemplate:
      typeof v.prompt_template === "string"
        ? v.prompt_template
        : FALLBACK_DRAFT.promptTemplate,
    negativePrompt:
      typeof v.negative_prompt === "string"
        ? v.negative_prompt
        : FALLBACK_DRAFT.negativePrompt,
  }
}

function readHires(raw: unknown): HiResConfig {
  if (!raw || typeof raw !== "object") return FALLBACK_HIRES
  const v = raw as Record<string, unknown>
  // Migration 064 used 'prompt' (single string); migration 065 changed to
  // 'prompt_template' with composable parts. Accept either.
  const prompt =
    typeof v.prompt === "string"
      ? v.prompt
      : typeof v.prompt_template === "string"
        ? (v.prompt_template as string)
        : FALLBACK_HIRES.prompt
  return {
    model: typeof v.model === "string" ? v.model : FALLBACK_HIRES.model,
    width: typeof v.width === "number" ? v.width : FALLBACK_HIRES.width,
    height: typeof v.height === "number" ? v.height : FALLBACK_HIRES.height,
    prompt,
  }
}

/**
 * Load both app_settings.ai_avatar_config and ai_avatar_options in one
 * round-trip. Server-side; safe to call from RSC pages and route handlers.
 */
export async function loadAvatarConfig(): Promise<AvatarConfig> {
  const supabase = await createSupabaseServerClient()
  const [{ data }, composition] = await Promise.all([
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_avatar_config", "ai_avatar_options"]),
    loadAvatarComposition(),
  ])

  const byKey = Object.fromEntries(
    (data ?? []).map((row) => [row.key, row.value])
  ) as Record<string, unknown>

  const cfg = (byKey["ai_avatar_config"] ?? {}) as Record<string, unknown>
  return {
    options: readOptions(byKey["ai_avatar_options"]),
    draft: readDraft(cfg.draft),
    hires: readHires(cfg.hires),
    composition,
  }
}

/**
 * Build the natural-language prompt by interpolating the DB-driven
 * draft.prompt_template with the user-selected params.
 */
export function buildPromptFromTemplate(
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
