import { z } from "zod"

import {
  CHALLENGE_STYLES,
  COACHING_STYLES,
  FEEDBACK_STYLES,
  GENDERS,
  INTERACTION_MODES,
  PERSONA_TYPES,
  VOICE_PROVIDERS,
} from "./constants"

const slider01 = z.number().int().min(0).max(100)
const ratio0to2 = z.number().min(0.5).max(2)
const ratio0to1 = z.number().min(0).max(1)

/**
 * Single source of truth for persona create + edit.
 *
 * The same schema validates the client form (via zodResolver) and the API
 * route handlers. Fields permitted to be cleared are nullable; fields that
 * must always have a value are required.
 *
 * Database columns omitted intentionally:
 *   - id, created_at — managed by the DB
 *   - prompt_sections, mode_prompts — JSONB; edited in raw mode for now and
 *     written via the API; added as a follow-up with a typed JSON editor
 */
export const personaSchema = z.object({
  // Identity
  name: z.string().trim().min(1, "Name is required").max(120),
  tagline: z.string().trim().max(280).nullable().optional(),
  persona_type: z.enum(PERSONA_TYPES),
  gender: z.enum(GENDERS),
  age_range: z.string().trim().max(40).nullable().optional(),
  cultural_background: z.string().trim().max(120).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999),
  is_active: z.boolean(),
  is_premium: z.boolean(),
  emotional_progression_enabled: z.boolean(),

  // Routing & style
  challenge_style: z
    .enum(CHALLENGE_STYLES.map((s) => s.value) as [string, ...string[]])
    .nullable()
    .optional(),
  coaching_style: z
    .enum(COACHING_STYLES.map((s) => s.value) as [string, ...string[]])
    .nullable()
    .optional(),
  domain_id: z.string().uuid().nullable().optional(),
  advisor_category_id: z.string().uuid().nullable().optional(),
  default_interaction_mode: z
    .enum(INTERACTION_MODES.map((m) => m.value) as [string, ...string[]])
    .nullable()
    .optional(),
  feedback_style: z
    .enum(FEEDBACK_STYLES.map((s) => s.value) as [string, ...string[]])
    .nullable()
    .optional(),

  // Personality sliders (mobile parity: 0–100 ints)
  warmth: slider01,
  directness: slider01,
  patience: slider01,
  humor: slider01,
  formality: slider01,

  specialty_areas: z.array(z.string().trim().min(1)),

  // Prompts
  system_prompt: z.string().trim().min(1, "System prompt is required"),
  qa_scenario_prompt: z.string().trim().nullable().optional(),
  qa_scene_template: z.string().trim().nullable().optional(),

  // Voice
  voice_provider: z.enum(VOICE_PROVIDERS),
  voice_id: z.string().trim().min(1, "Voice ID is required"),
  voice_speed: ratio0to2,
  voice_pitch: ratio0to2,
  voice_stability: ratio0to1,

  // AI config (flattened — server reassembles into ai_config jsonb)
  ai_model: z.string().min(1),
  ai_fallback_model: z.string().nullable().optional(),
  ai_temperature: ratio0to1,
  ai_top_p: ratio0to1,
  ai_max_completion_tokens: z.number().int().min(64).max(8192),

  // Avatar
  avatar_url: z.string().trim().min(1, "Avatar URL is required"),
  avatar_thumbnail_url: z.string().trim().nullable().optional(),
})

/** Shape submitted/typed in the form (defaults are optional). */
export type PersonaFormInput = z.input<typeof personaSchema>
/** Shape after resolver applies defaults (what handlers receive). */
export type PersonaFormValues = z.output<typeof personaSchema>

/** Refinements that depend on persona_type — applied in addition to the
 * field-level rules above. Coaches and advisors require a few more fields. */
export const personaSchemaWithRefinements = personaSchema.superRefine(
  (data, ctx) => {
    if (data.persona_type === "coach" && !data.domain_id) {
      ctx.addIssue({
        code: "custom",
        path: ["domain_id"],
        message: "Coaches must be assigned to a coaching domain.",
      })
    }
    if (data.persona_type === "advisor" && !data.advisor_category_id) {
      ctx.addIssue({
        code: "custom",
        path: ["advisor_category_id"],
        message: "Advisors must be assigned to an advisor category.",
      })
    }
    if (
      data.persona_type === "challenger" &&
      (!data.challenge_style || data.challenge_style.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["challenge_style"],
        message: "Challengers must have a challenge style.",
      })
    }
  }
)

export const DEFAULT_SYSTEM_PROMPT = [
  "You are {{name}}.",
  "",
  "{{character_demeanor}}",
  "{{conversation_register}}",
  "{{response_length}}",
  "{{response_depth}}",
  "{{humor_style}}",
  "{{challenge_intensity}}",
  "{{emotional_attunement}}",
  "{{directness}}",
  "{{topic_flexibility}}",
  "{{question_frequency}}",
  "{{energy_mirroring}}",
  "{{coaching_method}}",
].join("\n")

export const DEFAULT_PERSONA: PersonaFormValues = {
  name: "",
  tagline: null,
  persona_type: "challenger",
  gender: "male",
  age_range: null,
  cultural_background: null,
  sort_order: 0,
  is_active: true,
  is_premium: false,
  emotional_progression_enabled: false,
  challenge_style: "socratic",
  coaching_style: null,
  domain_id: null,
  advisor_category_id: null,
  default_interaction_mode: "coach_leads",
  feedback_style: "sandwich",
  warmth: 50,
  directness: 50,
  patience: 50,
  humor: 30,
  formality: 50,
  specialty_areas: [],
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  qa_scenario_prompt: null,
  qa_scene_template: null,
  voice_provider: "elevenlabs",
  voice_id: "",
  voice_speed: 1,
  voice_pitch: 1,
  voice_stability: 0.75,
  ai_model: "llama-3.3-70b-versatile",
  ai_fallback_model: null,
  ai_temperature: 0.7,
  ai_top_p: 0.9,
  ai_max_completion_tokens: 1024,
  avatar_url: "",
  avatar_thumbnail_url: null,
}
