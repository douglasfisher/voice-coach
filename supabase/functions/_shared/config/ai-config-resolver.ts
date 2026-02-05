/**
 * AI Configuration Resolver
 *
 * Provides hierarchical config resolution:
 * Global defaults → Task-specific → Per-persona → Runtime overrides
 *
 * This enables changing AI behavior via database without redeploying edge functions.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildCoachingPrompt,
  CoachingStyle,
  InteractionMode,
  FeedbackStyle,
  SessionPhase,
} from './coaching-prompts.ts';

// =============================================================================
// TYPES
// =============================================================================

export type AITaskType = 'chat' | 'analysis' | 'report' | 'challenge' | 'coaching' | 'coaching_feedback';

export interface AIResponseStyle {
  brevity: 'terse' | 'conversational' | 'detailed';
  max_sentences: number;
  include_questions: boolean;
  tone: 'warm_professional' | 'casual' | 'formal' | 'playful';
}

export interface AISystemModifiers {
  brevity_instruction?: string;
  safety_instruction?: string;
  persona_adherence?: string;
  custom_modifiers?: string[];
}

export interface AIDefaultSettings {
  temperature: number;
  top_p: number;
  max_completion_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
}

export interface AITaskSettings {
  max_completion_tokens?: number | null;
  temperature?: number | null;
}

export interface ResolvedAIConfig {
  // Model settings
  model: string;
  fallback_model?: string;
  temperature: number;
  top_p: number;
  max_completion_tokens: number;
  stop?: string[];

  // Prompts
  system_prompt: string;
  full_system_prompt: string; // system_prompt with modifiers prepended

  // Response style
  response_style: AIResponseStyle;

  // Cost tracking
  cost_per_million_input: number;
  cost_per_million_output: number;
}

export interface CoachingContext {
  scenarioContext?: string;
  scenarioVariant?: { name: string; context: string };
  userGoal?: string;
  interactionMode?: 'coach_leads' | 'user_leads' | 'turn_taking';
  currentPhase?: 'roleplay' | 'feedback';
  coachingStyle?: string;
  feedbackStyle?: string;
}

export interface ConfigResolverOptions {
  task: AITaskType;
  personaId?: string;
  overrides?: Partial<{
    model: string;
    temperature: number;
    max_completion_tokens: number;
  }>;
  coaching?: CoachingContext;
}

// =============================================================================
// DEFAULTS (only used if database fetch fails)
// =============================================================================

const FALLBACK_DEFAULTS: AIDefaultSettings = {
  temperature: 0.7,
  top_p: 0.9,
  max_completion_tokens: 512,
  presence_penalty: 0,
  frequency_penalty: 0,
};

const FALLBACK_RESPONSE_STYLE: AIResponseStyle = {
  brevity: 'conversational',
  max_sentences: 3,
  include_questions: true,
  tone: 'warm_professional',
};

const FALLBACK_MODEL = 'llama-3.3-70b-versatile';

// =============================================================================
// MAIN RESOLVER
// =============================================================================

/**
 * Resolves AI configuration using hierarchical merging:
 * 1. Global defaults from app_settings
 * 2. Task-specific settings from app_settings.ai_task_settings
 * 3. Persona-specific settings from personas.ai_config
 * 4. Runtime overrides (optional)
 */
export async function resolveAIConfig(
  supabase: SupabaseClient,
  options: ConfigResolverOptions
): Promise<ResolvedAIConfig> {
  const { task, personaId, overrides } = options;

  // 1. Fetch all relevant app_settings in one query
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'default_model',
      'ai_default_settings',
      'ai_task_settings',
      'ai_system_modifiers',
      'ai_response_style',
    ]);

  if (settingsError) {
    console.error('Failed to fetch app_settings:', settingsError);
  }

  // Parse settings into a map
  const settingsMap = new Map<string, unknown>();
  for (const s of settings || []) {
    settingsMap.set(s.key, parseSettingValue(s.value));
  }

  // 2. Extract global settings
  const globalDefaults = (settingsMap.get('ai_default_settings') as AIDefaultSettings) || FALLBACK_DEFAULTS;
  const allTaskSettings = (settingsMap.get('ai_task_settings') as Record<string, AITaskSettings>) || {};
  const taskSettings = allTaskSettings[task] || {};
  const responseStyle = (settingsMap.get('ai_response_style') as AIResponseStyle) || FALLBACK_RESPONSE_STYLE;
  const systemModifiers = (settingsMap.get('ai_system_modifiers') as AISystemModifiers) || {};
  const defaultModel = (settingsMap.get('default_model') as string) || FALLBACK_MODEL;

  // 3. Fetch persona config if specified
  let personaConfig: Record<string, unknown> = {};
  let personaPrompt = '';
  let costConfig = { input: 5, output: 15 }; // Default cost per million tokens (cents)
  let personaCoachingStyle: CoachingStyle | null = null;
  let personaFeedbackStyle: FeedbackStyle = 'sandwich';
  let personaInteractionMode: InteractionMode = 'coach_leads';

  if (personaId) {
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('ai_config, system_prompt, persona_type, coaching_style, feedback_style, default_interaction_mode')
      .eq('id', personaId)
      .single();

    if (personaError) {
      console.error('Failed to fetch persona:', personaError);
    } else if (persona) {
      personaConfig = (persona.ai_config as Record<string, unknown>) || {};
      personaPrompt = persona.system_prompt || '';

      // Extract coaching-specific persona fields
      if (persona.persona_type === 'coach') {
        personaCoachingStyle = persona.coaching_style as CoachingStyle || 'supportive_guide';
        personaFeedbackStyle = (persona.feedback_style as FeedbackStyle) || 'sandwich';
        personaInteractionMode = (persona.default_interaction_mode as InteractionMode) || 'coach_leads';
      }

      // Get cost from ai_models table if persona has a specific model
      const personaModel = personaConfig.model as string;
      if (personaModel) {
        const { data: modelInfo } = await supabase
          .from('ai_models')
          .select('cost_per_million_input, cost_per_million_output')
          .eq('id', personaModel)
          .single();

        if (modelInfo) {
          costConfig = {
            input: modelInfo.cost_per_million_input || 5,
            output: modelInfo.cost_per_million_output || 15,
          };
        }
      }
    }
  }

  // 4. Resolve each setting with hierarchy: overrides > persona > task > global
  const model = resolveValue([
    overrides?.model,
    personaConfig.model as string,
    defaultModel,
  ], FALLBACK_MODEL);

  const temperature = resolveValue([
    overrides?.temperature,
    personaConfig.temperature as number,
    taskSettings.temperature,
    globalDefaults.temperature,
  ], FALLBACK_DEFAULTS.temperature);

  const top_p = resolveValue([
    personaConfig.top_p as number,
    globalDefaults.top_p,
  ], FALLBACK_DEFAULTS.top_p);

  const max_completion_tokens = resolveValue([
    overrides?.max_completion_tokens,
    personaConfig.max_completion_tokens as number,
    taskSettings.max_completion_tokens,
    globalDefaults.max_completion_tokens,
  ], FALLBACK_DEFAULTS.max_completion_tokens);

  // 5. Build the full system prompt with modifiers
  let fullSystemPrompt: string;

  // Check if this is a coaching task and we have coaching context
  const isCoachingTask = task === 'coaching' || task === 'coaching_feedback';
  const { coaching } = options;

  if (isCoachingTask && coaching && personaCoachingStyle) {
    // Build coaching-specific prompt
    fullSystemPrompt = buildCoachingPrompt(personaPrompt, {
      coachingStyle: (coaching.coachingStyle as CoachingStyle) || personaCoachingStyle,
      interactionMode: (coaching.interactionMode as InteractionMode) || personaInteractionMode,
      feedbackStyle: (coaching.feedbackStyle as FeedbackStyle) || personaFeedbackStyle,
      currentPhase: (coaching.currentPhase as SessionPhase) || 'roleplay',
      scenarioContext: coaching.scenarioContext || '',
      scenarioVariant: coaching.scenarioVariant,
      userGoal: coaching.userGoal,
    });
  } else {
    // Standard prompt building for challengers
    const modifierText = buildSystemModifiers(systemModifiers, responseStyle);
    fullSystemPrompt = modifierText
      ? `${modifierText}\n\n---\n\n${personaPrompt}`
      : personaPrompt;
  }

  return {
    model,
    fallback_model: personaConfig.fallback_model as string | undefined,
    temperature,
    top_p,
    max_completion_tokens,
    stop: personaConfig.stop as string[] | undefined,
    system_prompt: personaPrompt,
    full_system_prompt: fullSystemPrompt,
    response_style: responseStyle,
    cost_per_million_input: costConfig.input,
    cost_per_million_output: costConfig.output,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse a setting value, handling JSON strings
 */
function parseSettingValue(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Resolve a value from a priority list, skipping null/undefined
 */
function resolveValue<T>(values: (T | null | undefined)[], fallback: T): T {
  for (const v of values) {
    if (v !== null && v !== undefined) {
      return v;
    }
  }
  return fallback;
}

/**
 * Build system modifier text from config
 */
function buildSystemModifiers(
  modifiers: AISystemModifiers,
  style: AIResponseStyle
): string {
  const parts: string[] = [];

  // Add brevity instruction
  if (modifiers.brevity_instruction) {
    parts.push(modifiers.brevity_instruction);
  }

  // Add safety instruction
  if (modifiers.safety_instruction) {
    parts.push(modifiers.safety_instruction);
  }

  // Add persona adherence
  if (modifiers.persona_adherence) {
    parts.push(modifiers.persona_adherence);
  }

  // Add custom modifiers
  if (modifiers.custom_modifiers?.length) {
    parts.push(...modifiers.custom_modifiers);
  }

  return parts.join('\n\n');
}

/**
 * Calculate cost in cents for a given usage
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  costPerMillionInput: number,
  costPerMillionOutput: number
): number {
  const inputCost = (promptTokens / 1_000_000) * costPerMillionInput;
  const outputCost = (completionTokens / 1_000_000) * costPerMillionOutput;
  return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal places
}
