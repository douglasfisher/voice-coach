import { TRAIT_TOKENS } from "./constants"
import type { PersonaFormValues } from "./schema"

/**
 * The five-section breakdown that compiles into system_prompt.
 * Order is significant — sections are joined in this order with a blank
 * line between them when compiling the final prompt.
 *
 * Mobile parity: per-section AI prompts now live in
 * app_settings.ai_persona_generator and are rendered server-side by
 * /api/admin/ai/section. The client only needs the keys/meta and the
 * pure helpers below.
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
