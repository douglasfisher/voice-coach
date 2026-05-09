/**
 * Persona enum values & lookups.
 *
 * Values are derived from the production database. When new options are
 * introduced via SQL, mirror them here so the form picks them up.
 */

export const PERSONA_TYPES = ["coach", "challenger", "advisor"] as const
export type PersonaType = (typeof PERSONA_TYPES)[number]

export const GENDERS = ["male", "female", "non_binary"] as const
export type Gender = (typeof GENDERS)[number]

export const CHALLENGE_STYLES = [
  { value: "socratic", label: "Socratic — guided questioning" },
  { value: "devils_advocate", label: "Devil's advocate — opposes for testing" },
  { value: "steelman", label: "Steelman — strongest opposing case" },
  { value: "empathetic_probe", label: "Empathetic probe — gentle exploration" },
  { value: "logical_surgeon", label: "Logical surgeon — precise dissection" },
  { value: "perspective_shifter", label: "Perspective shifter — alternative angles" },
] as const
export type ChallengeStyle = (typeof CHALLENGE_STYLES)[number]["value"]

export const COACHING_STYLES = [
  { value: "supportive_guide", label: "Supportive guide" },
  { value: "structured_mentor", label: "Structured mentor" },
  { value: "playful_mentor", label: "Playful mentor" },
  { value: "empathetic_guide", label: "Empathetic guide" },
  { value: "analytical_guide", label: "Analytical guide" },
  { value: "performance_coach", label: "Performance coach" },
  { value: "tough_love", label: "Tough love" },
  { value: "confidence_builder", label: "Confidence builder" },
  { value: "expert_advisor", label: "Expert advisor" },
  { value: "strategic_advisor", label: "Strategic advisor" },
] as const
export type CoachingStyle = (typeof COACHING_STYLES)[number]["value"]

export const INTERACTION_MODES = [
  { value: "coach_leads", label: "Coach leads", hint: "AI starts and drives" },
  { value: "user_leads", label: "User leads", hint: "User opens; AI follows" },
  { value: "turn_taking", label: "Turn-taking", hint: "Alternating cadence" },
  { value: "question_mode", label: "Q&A", hint: "User asks; AI answers" },
  {
    value: "advisor_mode",
    label: "Advisor mode",
    hint: "Clarifying Qs then advice",
  },
] as const
export type InteractionMode = (typeof INTERACTION_MODES)[number]["value"]

export const FEEDBACK_STYLES = [
  { value: "sandwich", label: "Sandwich (positive–critique–positive)" },
  { value: "direct", label: "Direct" },
  { value: "observational", label: "Observational" },
  { value: "question_based", label: "Question-based" },
] as const
export type FeedbackStyle = (typeof FEEDBACK_STYLES)[number]["value"]

export const VOICE_PROVIDERS = ["elevenlabs", "playht", "azure"] as const
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number]

/** The 12 trait tokens that must appear in system_prompt (mobile parity). */
export const TRAIT_TOKENS = [
  "character_demeanor",
  "conversation_register",
  "response_length",
  "response_depth",
  "humor_style",
  "challenge_intensity",
  "emotional_attunement",
  "directness",
  "topic_flexibility",
  "question_frequency",
  "energy_mirroring",
  "coaching_method",
] as const

export type TraitToken = (typeof TRAIT_TOKENS)[number]

export function getMissingTokens(systemPrompt: string): TraitToken[] {
  return TRAIT_TOKENS.filter(
    (t) => !systemPrompt.includes(`{{${t}}}`)
  ) as TraitToken[]
}

export function insertMissingTokens(systemPrompt: string): string {
  const missing = getMissingTokens(systemPrompt)
  if (missing.length === 0) return systemPrompt
  const block = missing.map((t) => `{{${t}}}`).join("\n")
  const sep = systemPrompt.endsWith("\n") ? "\n" : "\n\n"
  return `${systemPrompt}${sep}${block}\n`
}
