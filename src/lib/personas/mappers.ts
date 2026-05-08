import type { Database } from "@/types/database"
import type { PersonaFormValues } from "./schema"
import { DEFAULT_PERSONA } from "./schema"

type PersonaRow = Database["public"]["Tables"]["personas"]["Row"]
type PersonaInsert = Database["public"]["Tables"]["personas"]["Insert"]

type AiConfig = {
  model?: string
  fallback_model?: string | null
  temperature?: number
  top_p?: number
  max_completion_tokens?: number
}

function readAiConfig(value: unknown): AiConfig {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AiConfig
  }
  return {}
}

const EMPTY_SECTIONS: NonNullable<PersonaFormValues["prompt_sections"]> = {
  identity: "",
  trait_tokens: "",
  character_traits: "",
  roleplay_behavior: "",
  coaching_approach: "",
}

function readAvatarParams(
  value: unknown
): PersonaFormValues["avatar_params"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const p = v.params
  if (!p || typeof p !== "object" || Array.isArray(p)) return null
  const pp = p as Record<string, unknown>
  const accessories = Array.isArray(pp.accessories)
    ? (pp.accessories.filter((a) => typeof a === "string") as string[])
    : []
  const str = (k: string) => (typeof pp[k] === "string" ? (pp[k] as string) : "")
  return {
    params: {
      gender: str("gender"),
      age_range: str("age_range"),
      ethnicity: str("ethnicity"),
      appearance: str("appearance"),
      lighting: str("lighting"),
      clothing: str("clothing"),
      expression: str("expression"),
      accessories,
      pose: str("pose"),
      camera: str("camera"),
    },
    prompt: typeof v.prompt === "string" ? v.prompt : "",
  }
}

function readPromptSections(
  value: unknown
): PersonaFormValues["prompt_sections"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const v = value as Record<string, unknown>
  return {
    identity: typeof v.identity === "string" ? v.identity : "",
    trait_tokens:
      typeof v.trait_tokens === "string" ? v.trait_tokens : "",
    character_traits:
      typeof v.character_traits === "string" ? v.character_traits : "",
    roleplay_behavior:
      typeof v.roleplay_behavior === "string" ? v.roleplay_behavior : "",
    coaching_approach:
      typeof v.coaching_approach === "string" ? v.coaching_approach : "",
  }
}

/** DB row → form values (for the edit page). */
export function personaRowToForm(row: PersonaRow): PersonaFormValues {
  const ai = readAiConfig(row.ai_config)
  return {
    name: row.name ?? "",
    tagline: row.tagline,
    persona_type: (row.persona_type ?? "challenger") as PersonaFormValues["persona_type"],
    gender: (row.gender ?? "male") as PersonaFormValues["gender"],
    age_range: row.age_range,
    cultural_background: row.cultural_background,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active ?? true,
    is_premium: row.is_premium ?? false,
    emotional_progression_enabled: row.emotional_progression_enabled ?? false,

    challenge_style: row.challenge_style ?? null,
    coaching_style: row.coaching_style,
    domain_id: row.domain_id,
    advisor_category_id: row.advisor_category_id,
    default_interaction_mode: row.default_interaction_mode,
    feedback_style: row.feedback_style,

    warmth: row.warmth ?? 50,
    directness: row.directness ?? 50,
    patience: row.patience ?? 50,
    humor: row.humor ?? 30,
    formality: row.formality ?? 50,

    specialty_areas: row.specialty_areas ?? [],

    system_prompt: row.system_prompt ?? DEFAULT_PERSONA.system_prompt,
    qa_scenario_prompt: row.qa_scenario_prompt,
    qa_scene_template: row.qa_scene_template,
    prompt_sections:
      readPromptSections(row.prompt_sections) ?? EMPTY_SECTIONS,

    voice_provider: (row.voice_provider ?? "elevenlabs") as PersonaFormValues["voice_provider"],
    voice_id: row.voice_id ?? "",
    voice_speed: Number(row.voice_speed ?? 1),
    voice_pitch: Number(row.voice_pitch ?? 1),
    voice_stability: Number(row.voice_stability ?? 0.75),

    ai_model: ai.model ?? DEFAULT_PERSONA.ai_model,
    ai_fallback_model: ai.fallback_model ?? null,
    ai_temperature: ai.temperature ?? 0.7,
    ai_top_p: ai.top_p ?? 0.9,
    ai_max_completion_tokens: ai.max_completion_tokens ?? 1024,

    avatar_url: row.avatar_url ?? "",
    avatar_thumbnail_url: row.avatar_thumbnail_url,
    avatar_params: readAvatarParams(row.avatar_params),
  }
}

/** Form values → DB insert/update payload. Reassembles ai_config JSONB. */
export function formToPersonaPayload(
  form: PersonaFormValues
): Omit<PersonaInsert, "id" | "created_at"> {
  return {
    name: form.name,
    tagline: form.tagline ?? null,
    persona_type: form.persona_type,
    gender: form.gender,
    age_range: form.age_range ?? null,
    cultural_background: form.cultural_background ?? null,
    sort_order: form.sort_order,
    is_active: form.is_active,
    is_premium: form.is_premium,
    emotional_progression_enabled: form.emotional_progression_enabled,

    challenge_style: form.challenge_style ?? "",
    coaching_style: form.coaching_style ?? null,
    domain_id: form.domain_id ?? null,
    advisor_category_id: form.advisor_category_id ?? null,
    default_interaction_mode: form.default_interaction_mode ?? null,
    feedback_style: form.feedback_style ?? null,

    warmth: form.warmth,
    directness: form.directness,
    patience: form.patience,
    humor: form.humor,
    formality: form.formality,

    specialty_areas: form.specialty_areas,

    system_prompt: form.system_prompt,
    qa_scenario_prompt: form.qa_scenario_prompt ?? null,
    qa_scene_template: form.qa_scene_template ?? null,
    prompt_sections: form.prompt_sections ?? null,

    voice_provider: form.voice_provider,
    voice_id: form.voice_id,
    voice_speed: form.voice_speed,
    voice_pitch: form.voice_pitch,
    voice_stability: form.voice_stability,

    ai_config: {
      model: form.ai_model,
      fallback_model: form.ai_fallback_model ?? null,
      temperature: form.ai_temperature,
      top_p: form.ai_top_p,
      max_completion_tokens: form.ai_max_completion_tokens,
    },

    avatar_url: form.avatar_url,
    avatar_thumbnail_url: form.avatar_thumbnail_url ?? null,
    avatar_params: (form.avatar_params ?? null) as PersonaInsert["avatar_params"],
  }
}
