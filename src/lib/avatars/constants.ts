/**
 * Avatar generation parameter options. Mirrors the mobile app's
 * types/wizard.ts so prompts produced here look identical to those
 * produced by the wizard. Keep both in sync if you add/remove options.
 *
 * The Runware request models, dimensions, and negative prompt also live
 * here so they're a single source of truth.
 */

export const GENDER_OPTIONS = ["male", "female"] as const

export const AGE_RANGE_OPTIONS = [
  "20",
  "early twenties",
  "late twenties",
  "early thirties",
  "late thirties",
  "early forties",
  "late forties",
  "early fifties",
  "late fifties",
  "early sixties",
  "late sixties",
  "early seventies",
  "late seventies",
  "early eighties",
  "late eighties",
  "early nineties",
  "late nineties",
  "100",
] as const

export const ETHNICITY_OPTIONS = [
  // Americas
  "American",
  "African American",
  "Brazilian",
  "Mexican",
  "Colombian",
  "Indigenous American",
  // Northern Europe
  "English",
  "Irish",
  "Scottish",
  "Scandinavian",
  "Norwegian",
  "Icelandic",
  "German",
  "Dutch",
  // Southern & Eastern Europe
  "Italian",
  "Spanish",
  "Greek",
  "French",
  "Eastern European",
  "Russian",
  // Middle East & North Africa
  "Arab",
  "Turkish",
  "Persian",
  "North African",
  // Sub-Saharan Africa
  "West African",
  "East African",
  "South African",
  // South & East Asia
  "Indian",
  "Japanese",
  "Korean",
  "Chinese",
  "Filipino",
  "Thai",
  "Vietnamese",
  // Oceania
  "Pacific Islander",
  "Australian Aboriginal",
  // Mixed
  "Mixed Heritage",
] as const

export const APPEARANCE_OPTIONS = [
  "classically attractive",
  "ruggedly handsome",
  "striking features",
  "warm and approachable",
  "youthful and fresh-faced",
  "distinguished and mature",
  "quirky and unique",
  "sharp and angular",
  "soft and gentle",
  "bold and commanding",
  "girl-next-door",
  "boy-next-door",
  "elegant and refined",
  "athletic and toned",
] as const

export const LIGHTING_OPTIONS = [
  "soft studio",
  "hard studio",
  "classic three point studio lighting",
  "three-point studio lighting with sharp key, fill and rim separation",
  "Rembrandt lighting with butterfly kicker and edge-lit hair light",
  "high-contrast clamshell lighting with specular rim",
  "split lighting with hot hair light and negative fill",
  "butterfly beauty lighting with dual strip softbox rim lights",
  "paramount lighting with wraparound cove fill and backlit hair",
  "broad key with silver bounce fill and focused snoot hair light",
  "large octabox key with gridded strip kickers at 45°",
  "low-key chiaroscuro with single fresnel key and subtle hair kicker",
  "high-key beauty dish with barn-doored background separation lights",
  "tungsten-gelled key with cool-fill contrast and hot backlight",
  "natural window",
  "warm golden hour",
] as const

export const CLOTHING_OPTIONS = [
  "casual",
  "business casual",
  "formal",
  "athletic",
  "creative/bohemian",
  "streetwear",
] as const

export const EXPRESSION_OPTIONS = [
  "warm smile",
  "confident smirk",
  "thoughtful gaze",
  "friendly laugh",
  "serene calm",
  "intense focus",
] as const

export const ACCESSORY_OPTIONS = [
  "glasses",
  "earrings",
  "necklace",
  "headband",
  "scarf",
  "hat",
  "none",
] as const

export const POSE_OPTIONS = [
  "straight-on",
  "slight angle",
  "three-quarter turn",
  "profile",
] as const

export const CAMERA_OPTIONS = [
  "Canon 85mm f/1.4",
  "Sony 50mm f/1.2",
  "Nikon 105mm f/2.8",
  "Hasselblad medium format 150mm f2.8",
  "shot on medium format, f/2.8 shallow depth",
  "editorial grade colour science",
  "specular catch lights, magazine-quality retouching",
  "Phase One IQ4 150MP detail",
] as const

export type AvatarParams = {
  gender: (typeof GENDER_OPTIONS)[number]
  age_range: (typeof AGE_RANGE_OPTIONS)[number]
  ethnicity: (typeof ETHNICITY_OPTIONS)[number]
  appearance: (typeof APPEARANCE_OPTIONS)[number]
  lighting: (typeof LIGHTING_OPTIONS)[number]
  clothing: (typeof CLOTHING_OPTIONS)[number]
  expression: (typeof EXPRESSION_OPTIONS)[number]
  accessories: (typeof ACCESSORY_OPTIONS)[number][]
  pose: (typeof POSE_OPTIONS)[number]
  camera: (typeof CAMERA_OPTIONS)[number]
}

/**
 * Fallback only — used if app_settings.ai_avatar_options is missing or
 * malformed at request time. Keep in lockstep with the mobile app's
 * DEFAULT_AVATAR_PARAMS in stores/wizardStore.ts. The mobile literal value
 * "Northern European" isn't in ETHNICITY_OPTIONS (legacy bug); we map it
 * to the closest valid option here, "English".
 */
export const DEFAULT_AVATAR_PARAMS: AvatarParams = {
  gender: "male",
  age_range: "late twenties",
  ethnicity: "English",
  appearance: "classically attractive",
  lighting: "Rembrandt lighting with butterfly kicker and edge-lit hair light",
  clothing: "formal",
  expression: "warm smile",
  accessories: ["none"],
  pose: "slight angle",
  camera: "shot on medium format, f/2.8 shallow depth",
}

/** Assembles the natural-language prompt sent to Runware. Identical to
 * the mobile app's stores/wizardStore.ts buildPromptFromParams (no DB
 * template provided path). DB-driven templates are rendered by
 * buildPromptFromTemplate in lib/avatars/config.ts. */
export function buildPromptFromParams(params: AvatarParams): string {
  const accessoriesText = params.accessories
    .filter((a) => a !== "none")
    .join(", ")
  const accessoriesPart = accessoriesText
    ? `wearing ${accessoriesText}`
    : "no accessories"
  return [
    `A classic mid-length head and shoulders portrait of a ${params.age_range} ${params.appearance} ${params.ethnicity} ${params.gender},`,
    `${params.expression},`,
    `wearing ${params.clothing} attire,`,
    `${accessoriesPart},`,
    `${params.pose} composition,`,
    `lit with ${params.lighting} lighting on a dark charcoal background with space around.`,
    `Shot on ${params.camera}.`,
  ].join(" ")
}

/** Toggles an accessory in the multi-select. Selecting "none" clears the
 * others; selecting any specific accessory removes "none". */
export function toggleAccessory(
  current: AvatarParams["accessories"],
  next: AvatarParams["accessories"][number]
): AvatarParams["accessories"] {
  if (next === "none") return ["none"]
  const without = current.filter((a) => a !== "none" && a !== next)
  if (current.includes(next)) {
    return without.length ? without : ["none"]
  }
  return [...without, next]
}

export function randomizeAvatarParams(
  gender?: AvatarParams["gender"]
): AvatarParams {
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)] as T
  return {
    gender: gender ?? pick(GENDER_OPTIONS),
    age_range: pick(AGE_RANGE_OPTIONS),
    ethnicity: pick(ETHNICITY_OPTIONS),
    appearance: pick(APPEARANCE_OPTIONS),
    lighting: pick(LIGHTING_OPTIONS),
    clothing: pick(CLOTHING_OPTIONS),
    expression: pick(EXPRESSION_OPTIONS),
    accessories: ["none"],
    pose: pick(POSE_OPTIONS),
    camera: pick(CAMERA_OPTIONS),
  }
}

// --- Runware request constants -------------------------------------------
//
// Identical to mobile so generated images match style + dimensions.

export const DRAFTS_MODEL = "runware:400@1"
export const DRAFTS_WIDTH = 896
export const DRAFTS_HEIGHT = 1152
export const DRAFTS_COUNT = 4
export const DRAFTS_NEGATIVE_PROMPT =
  "cartoon, anime, 3d render, distorted, blurry, low quality, text, watermark"
export const DRAFTS_CFG_SCALE = 3.5
export const DRAFTS_SCHEDULER = "FlowMatchEulerDiscreteScheduler"

export const UPSCALE_MODEL = "google:4@2"
export const UPSCALE_WIDTH = 1792
export const UPSCALE_HEIGHT = 2400
export const UPSCALE_PROMPT =
  "make this is more photorealistic, with full ultra photorealistic details but keep the same pose and position in the frame"
