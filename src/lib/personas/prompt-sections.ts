import { TRAIT_TOKENS } from "./constants"
import type { PersonaFormValues } from "./schema"

/**
 * The five-section breakdown that compiles into system_prompt.
 * Order is significant — sections are joined in this order with a blank
 * line between them when compiling the final prompt.
 */
export const SECTION_KEYS = [
  "identity",
  "trait_tokens",
  "character_traits",
  "roleplay_behavior",
  "coaching_approach",
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_META: Record<
  SectionKey,
  {
    title: string
    summary: string
    /** Marker text the AI must include — empty if not applicable. */
    marker: string | null
    /** Section can be AI-generated (false for trait_tokens which is a static list) */
    aiGeneratable: boolean
  }
> = {
  identity: {
    title: "Identity",
    summary:
      "Opening paragraph: who they are, their background, and how they approach coaching.",
    marker: null,
    aiGeneratable: true,
  },
  trait_tokens: {
    title: "Trait tokens",
    summary:
      "12 placeholder tokens interpolated at chat time with the user's selected trait values. Reset to insert all 12.",
    marker: null,
    aiGeneratable: false,
  },
  character_traits: {
    title: "Character traits",
    summary:
      "CHARACTER TRAITS header + {{character_demeanor}} placeholder + 4–6 specific trait bullets.",
    marker: "CHARACTER TRAITS:",
    aiGeneratable: true,
  },
  roleplay_behavior: {
    title: "Roleplay behavior",
    summary:
      "WHEN IN ROLEPLAY: header + 5–7 directive bullets describing in-character behavior.",
    marker: "WHEN IN ROLEPLAY:",
    aiGeneratable: true,
  },
  coaching_approach: {
    title: "Coaching approach",
    summary:
      "COACHING APPROACH: header + 4–6 bullets describing methodology and philosophy.",
    marker: "COACHING APPROACH:",
    aiGeneratable: true,
  },
}

/** Default trait_tokens content — all 12 placeholders, one per line. */
export function defaultTraitTokensSection(): string {
  return TRAIT_TOKENS.map((t) => `{{${t}}}`).join("\n")
}

/**
 * Builds the persona context block included in every AI section call.
 * Mirrors the mobile wizard's persona snapshot.
 */
export function personaContextFor(form: PersonaFormValues): string {
  const lines: string[] = []
  if (form.name) lines.push(`Name: ${form.name}`)
  if (form.tagline) lines.push(`Tagline: ${form.tagline}`)
  if (form.cultural_background)
    lines.push(`Cultural Background: ${form.cultural_background}`)
  if (form.age_range) lines.push(`Age range: ${form.age_range}`)
  lines.push(`Type: ${form.persona_type}`)
  lines.push(`Gender: ${form.gender}`)
  if (form.coaching_style)
    lines.push(`Coaching Style: ${form.coaching_style}`)
  if (form.challenge_style)
    lines.push(`Challenge Style: ${form.challenge_style}`)
  if (form.feedback_style)
    lines.push(`Feedback Style: ${form.feedback_style}`)
  lines.push(
    `Personality (0–100): warmth ${form.warmth}, directness ${form.directness}, patience ${form.patience}, humor ${form.humor}, formality ${form.formality}`
  )
  if (form.specialty_areas.length)
    lines.push(`Specialty areas: ${form.specialty_areas.join(", ")}`)
  return lines.join("\n")
}

/**
 * Per-section AI generation prompts. Returned as a system + user pair sent
 * to the chat edge function with action: 'complete'.
 */
export function sectionPromptFor(
  section: SectionKey,
  form: PersonaFormValues
): { systemPrompt: string; userPrompt: string } {
  const context = personaContextFor(form)
  const systemPrompt =
    "You are an expert prompt engineer who writes concise, specific persona instructions for an AI coaching app. Your output is plain text only — no markdown, no commentary, no quoted code blocks."

  const tasks: Record<SectionKey, string> = {
    identity: `Write the opening identity paragraph for this AI coaching persona. Start with "You are ${form.name || "[Name]"}, a [role descriptor]…" and establish who they are, their background, and how they approach their work. 2–4 sentences. No headers, no bullets — just the paragraph.`,
    trait_tokens:
      "Output exactly the 12 trait token placeholders, one per line, with no surrounding text. Tokens: " +
      TRAIT_TOKENS.map((t) => `{{${t}}}`).join(" "),
    character_traits: `Write a CHARACTER TRAITS section. Start with "CHARACTER TRAITS:" on its own line. Then on the next line, the placeholder "{{character_demeanor}}" alone. Then 4–6 bullet points (each starting with "- "), each one concise sentence describing a specific character trait of this persona.`,
    roleplay_behavior: `Write a "WHEN IN ROLEPLAY:" section. Start with "WHEN IN ROLEPLAY:" on its own line. Then 5–7 bullet points (each starting with "- ") describing specific roleplay behaviors and rules — one concise directive per bullet.`,
    coaching_approach: `Write a "COACHING APPROACH:" section. Start with "COACHING APPROACH:" on its own line. Then 4–6 bullet points (each starting with "- ") describing specific coaching methods and philosophy — one concise sentence per bullet.`,
  }

  const userPrompt = `${tasks[section]}\n\nPersona context:\n${context}`
  return { systemPrompt, userPrompt }
}

/**
 * Compile the 5 sections into a final system_prompt — sections joined
 * with double newlines, in the canonical order. Empty sections skipped.
 */
export function compileSections(
  sections: NonNullable<PersonaFormValues["prompt_sections"]>
): string {
  return SECTION_KEYS.map((k) => sections[k]?.trim())
    .filter((s): s is string => Boolean(s))
    .join("\n\n")
}
