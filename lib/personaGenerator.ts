/**
 * Mobile-side helpers for the AI persona generator.
 *
 * Loads meta-prompts from app_settings.ai_persona_generator (DB-driven so
 * the web admin can edit them and have changes flow to mobile without a
 * deploy). Falls back to a hardcoded copy if the row is missing or the
 * device is offline — the strings below are byte-for-byte identical to
 * migration 078 so behaviour matches in both paths.
 *
 * Keep in sync with:
 *   - supabase/migrations/078_persona_generator_config.sql
 *   - dialectica-admin/src/lib/personas/generator-config.ts
 */

import { AiPersonaGeneratorConfig } from '../types/admin';
import { invalidateAppSetting } from '../hooks/useAppSetting';
import { supabase } from './supabase';

const FALLBACK: AiPersonaGeneratorConfig = {
  model_settings: { temperature: 0.9, max_completion_tokens: 1024 },
  details: {
    system:
      'You are a creative character designer for a coaching app. Return only valid JSON.',
    user_template: `Based on this avatar description, generate persona details for a coaching app character.

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
  system_prompt: {
    system:
      'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompts.',
    user_template: `Create a system prompt for an AI coaching persona with these characteristics:

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
    _system:
      'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompt sections.',
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
  persona_context_template: `Name: {{name|or 'Unknown'}}
Tagline: {{tagline|or 'None'}}
Cultural Background: {{cultural_background|or 'None'}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or 'Not set'}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}`,
};

// Module cache so opening the wizard, generating, then re-generating
// doesn't re-fetch the row on every action. 5-minute TTL aligns with the
// web admin's `dynamic = "force-dynamic"` re-read pattern.
let cachedConfig: AiPersonaGeneratorConfig | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Load the persona-generator config from app_settings, with a hardcoded
 * fallback if the row is missing or unreachable. Always resolves — never
 * throws — so callers don't have to handle a degraded path explicitly.
 */
export async function loadPersonaGeneratorConfig(): Promise<AiPersonaGeneratorConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL) return cachedConfig;

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_persona_generator')
      .single();

    if (error || !data?.value) {
      cachedConfig = FALLBACK;
      cachedAt = now;
      return FALLBACK;
    }

    const merged = mergeWithFallback(data.value as Partial<AiPersonaGeneratorConfig>);
    cachedConfig = merged;
    cachedAt = now;
    return merged;
  } catch {
    cachedConfig = FALLBACK;
    cachedAt = now;
    return FALLBACK;
  }
}

/** Force the next call to refetch — wired to the same listener system used
 * by useAppSetting so an admin-side save propagates. */
export function invalidatePersonaGeneratorConfig() {
  cachedConfig = null;
  cachedAt = 0;
  invalidateAppSetting('ai_persona_generator');
}

/**
 * Build the {{token}} dictionary the persona-generator templates expect.
 * Mirrors the web admin's buildContextVars so a given (form, avatar)
 * pair renders identical prompts on both clients.
 *
 * The accessories formatting collapses an all-"none" list to the literal
 * string "none" and otherwise filters "none" out of multi-select arrays.
 */
export function buildContextVars(args: {
  form: {
    name?: string | null;
    tagline?: string | null;
    cultural_background?: string | null;
    persona_type?: string;
    coaching_style?: string | null;
    challenge_style?: string | null;
    feedback_style?: string | null;
    warmth?: number;
    directness?: number;
    patience?: number;
    humor?: number;
    formality?: number;
  };
  avatarParams?: {
    ageRange?: string | null;
    ethnicity?: string | null;
    gender?: string | null;
    expression?: string | null;
    clothing?: string | null;
    accessories?: string[];
  };
}): Record<string, string | number> {
  const { form, avatarParams } = args;
  const acc = avatarParams?.accessories ?? [];
  const accessoriesText =
    acc.length === 0 || acc.every((a) => a === 'none')
      ? 'none'
      : acc.filter((a) => a !== 'none').join(', ');

  return {
    name: form.name ?? '',
    tagline: form.tagline ?? '',
    cultural_background: form.cultural_background ?? '',
    persona_type: form.persona_type ?? '',
    coaching_style: form.coaching_style ?? '',
    challenge_style: form.challenge_style ?? '',
    feedback_style: form.feedback_style ?? '',
    warmth: form.warmth ?? 0,
    directness: form.directness ?? 0,
    patience: form.patience ?? 0,
    humor: form.humor ?? 0,
    formality: form.formality ?? 0,
    age_range: avatarParams?.ageRange ?? '',
    ethnicity: avatarParams?.ethnicity ?? '',
    gender: avatarParams?.gender ?? '',
    expression: avatarParams?.expression ?? '',
    clothing: avatarParams?.clothing ?? '',
    accessories: accessoriesText,
  };
}

/**
 * Renders a template with {{var}} and {{var|or 'fallback'}} placeholders.
 * Mirrors the web admin's renderTemplate so output matches byte-for-byte.
 */
export function renderTemplate(
  tpl: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  const FALLBACK_RE = /\{\{\s*([a-z_][a-z0-9_]*)\s*\|\s*or\s*'([^']*)'\s*\}\}/gi;
  const PLAIN_RE = /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi;
  const get = (key: string): string => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v);
  };
  return tpl
    .replace(FALLBACK_RE, (_m: string, key: string, fb: string) => {
      const v = get(key).trim();
      return v.length > 0 ? v : fb;
    })
    .replace(PLAIN_RE, (_m: string, key: string) => get(key));
}

/** Defensive merge — DB row may be partial. Whitelist of expected keys. */
function mergeWithFallback(
  raw: Partial<AiPersonaGeneratorConfig>,
): AiPersonaGeneratorConfig {
  return {
    model_settings: {
      temperature:
        typeof raw.model_settings?.temperature === 'number'
          ? raw.model_settings.temperature
          : FALLBACK.model_settings.temperature,
      max_completion_tokens:
        typeof raw.model_settings?.max_completion_tokens === 'number'
          ? raw.model_settings.max_completion_tokens
          : FALLBACK.model_settings.max_completion_tokens,
    },
    details: {
      system: raw.details?.system?.trim()
        ? raw.details.system
        : FALLBACK.details.system,
      user_template: raw.details?.user_template?.trim()
        ? raw.details.user_template
        : FALLBACK.details.user_template,
    },
    system_prompt: {
      system: raw.system_prompt?.system?.trim()
        ? raw.system_prompt.system
        : FALLBACK.system_prompt.system,
      user_template: raw.system_prompt?.user_template?.trim()
        ? raw.system_prompt.user_template
        : FALLBACK.system_prompt.user_template,
    },
    sections: {
      _system: raw.sections?._system?.trim()
        ? raw.sections._system
        : FALLBACK.sections._system,
      identity: raw.sections?.identity?.trim()
        ? raw.sections.identity
        : FALLBACK.sections.identity,
      character_traits: raw.sections?.character_traits?.trim()
        ? raw.sections.character_traits
        : FALLBACK.sections.character_traits,
      roleplay_behavior: raw.sections?.roleplay_behavior?.trim()
        ? raw.sections.roleplay_behavior
        : FALLBACK.sections.roleplay_behavior,
      coaching_approach: raw.sections?.coaching_approach?.trim()
        ? raw.sections.coaching_approach
        : FALLBACK.sections.coaching_approach,
    },
    persona_context_template: raw.persona_context_template?.trim()
      ? raw.persona_context_template
      : FALLBACK.persona_context_template,
  };
}
