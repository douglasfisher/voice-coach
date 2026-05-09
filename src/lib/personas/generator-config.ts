import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Server-side loader for app_settings.ai_persona_generator. Mirrors the
 * pattern used by lib/avatars/config.ts: read DB, validate shape, fall
 * back to a hardcoded copy of the same prompts so the feature still
 * works if the row is missing or malformed.
 *
 * The fallback strings are byte-for-byte identical to migration 078 — if
 * we update one, update the other. Keep in sync with the mobile prompts
 * in feature/prompt-splitting:stores/wizardStore.ts.
 */

export type PersonaGeneratorConfig = {
  modelSettings: { temperature: number; max_completion_tokens: number }
  details: { system: string; userTemplate: string }
  systemPrompt: { system: string; userTemplate: string }
  sections: {
    system: string
    identity: string
    character_traits: string
    roleplay_behavior: string
    coaching_approach: string
  }
  personaContextTemplate: string
}

const FALLBACK: PersonaGeneratorConfig = {
  modelSettings: { temperature: 0.9, max_completion_tokens: 1024 },
  details: {
    system:
      "You are a creative character designer for a coaching app. Return only valid JSON.",
    userTemplate: `Based on this avatar description, generate persona details for a coaching app character.

Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}.

Generate a JSON object with these fields:
- name: A culturally appropriate full name (first + last)
- tagline: A short catchy tagline (5-8 words) describing their coaching style
- cultural_background: A brief cultural/professional background (e.g., "Japanese-American, Executive Coach")
- coaching_style: One of: supportive_guide, tough_love, playful_mentor, expert_advisor, confidence_builder
- challenge_style: One of: socratic, devils_advocate, steelman, empathetic_probe, logical_surgeon, perspective_shifter
- warmth: number 0-100
- directness: number 0-100
- patience: number 0-100
- humor: number 0-100
- formality: number 0-100

Return ONLY valid JSON, no markdown or explanation.`,
  },
  systemPrompt: {
    system:
      "You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompts.",
    userTemplate: `Create a system prompt for an AI coaching persona with these characteristics:

Name: {{name|or 'Unknown'}}
Tagline: {{tagline|or 'None'}}
Cultural Background: {{cultural_background|or 'None'}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or 'Not set'}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}

Write a detailed system prompt (200-400 words) that:
1. Establishes the persona's voice and communication style
2. Defines how they coach/challenge users
3. Sets boundaries and personality traits
4. Includes these trait token placeholders where appropriate: {{character_demeanor}}, {{conversation_register}}, {{vocabulary_complexity}}, {{emotional_tone}}, {{response_pacing}}, {{cultural_context}}

Return ONLY the system prompt text, no explanation or markdown.`,
  },
  sections: {
    system:
      "You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompt sections.",
    identity: `Write an opening identity paragraph for this AI coaching persona. Start with "You are [Name], a [role]..." and establish who they are, their background, and their approach. 2-4 sentences.

Persona:
{{persona_context}}

Return ONLY the paragraph, no explanation.`,
    character_traits: `Write a CHARACTER TRAITS section for this AI coaching persona. Start with "CHARACTER TRAITS:" on its own line, then include the placeholder {{character_demeanor}} on its own line, followed by 4-6 bullet points describing specific character traits. Each bullet should be one concise sentence.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.`,
    roleplay_behavior: `Write a "WHEN IN ROLEPLAY:" section for this AI coaching persona. Start with "WHEN IN ROLEPLAY:" on its own line, then 5-7 bullet points describing specific roleplay behaviors and rules. Each bullet should be one concise directive.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.`,
    coaching_approach: `Write a "COACHING APPROACH:" section for this AI coaching persona. Start with "COACHING APPROACH:" on its own line, then 4-6 bullet points describing specific coaching methods and philosophy. Each bullet should be one concise sentence.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.`,
  },
  personaContextTemplate: `Name: {{name|or 'Unknown'}}
Tagline: {{tagline|or 'None'}}
Cultural Background: {{cultural_background|or 'None'}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or 'Not set'}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}`,
}

function readString(v: unknown, fb: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fb
}

function readNumber(v: unknown, fb: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fb
}

export async function loadPersonaGeneratorConfig(): Promise<PersonaGeneratorConfig> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_persona_generator")
    .maybeSingle()

  if (!data?.value || typeof data.value !== "object") return FALLBACK
  const v = data.value as Record<string, unknown>

  const ms =
    v.model_settings && typeof v.model_settings === "object"
      ? (v.model_settings as Record<string, unknown>)
      : {}
  const det =
    v.details && typeof v.details === "object"
      ? (v.details as Record<string, unknown>)
      : {}
  const sp =
    v.system_prompt && typeof v.system_prompt === "object"
      ? (v.system_prompt as Record<string, unknown>)
      : {}
  const sec =
    v.sections && typeof v.sections === "object"
      ? (v.sections as Record<string, unknown>)
      : {}

  return {
    modelSettings: {
      temperature: readNumber(
        ms.temperature,
        FALLBACK.modelSettings.temperature
      ),
      max_completion_tokens: readNumber(
        ms.max_completion_tokens,
        FALLBACK.modelSettings.max_completion_tokens
      ),
    },
    details: {
      system: readString(det.system, FALLBACK.details.system),
      userTemplate: readString(
        det.user_template,
        FALLBACK.details.userTemplate
      ),
    },
    systemPrompt: {
      system: readString(sp.system, FALLBACK.systemPrompt.system),
      userTemplate: readString(
        sp.user_template,
        FALLBACK.systemPrompt.userTemplate
      ),
    },
    sections: {
      system: readString(sec._system, FALLBACK.sections.system),
      identity: readString(sec.identity, FALLBACK.sections.identity),
      character_traits: readString(
        sec.character_traits,
        FALLBACK.sections.character_traits
      ),
      roleplay_behavior: readString(
        sec.roleplay_behavior,
        FALLBACK.sections.roleplay_behavior
      ),
      coaching_approach: readString(
        sec.coaching_approach,
        FALLBACK.sections.coaching_approach
      ),
    },
    personaContextTemplate: readString(
      v.persona_context_template,
      FALLBACK.personaContextTemplate
    ),
  }
}
