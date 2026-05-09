/**
 * Admin System Types
 *
 * Types for admin panel functionality including user management,
 * usage tracking, and app settings.
 */

import { UserProfile, Persona } from './database';

// =============================================================================
// MODEL COSTS (Configured in database per-persona ai_config)
// =============================================================================

/**
 * Cost per 1 million tokens in USD cents
 * NOTE: Model costs are now stored in the database (personas.ai_config)
 * This interface is kept for type compatibility
 */
export interface ModelCost {
  input: number;
  output: number;
}

/**
 * Calculate cost in cents for given token counts and cost rates
 * Cost rates should come from database (persona.ai_config.cost_per_million_input/output)
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  costPerMillionInput: number,
  costPerMillionOutput: number
): number {
  const inputCost = (promptTokens / 1_000_000) * costPerMillionInput;
  const outputCost = (completionTokens / 1_000_000) * costPerMillionOutput;
  return Math.ceil((inputCost + outputCost) * 100); // cents
}

// =============================================================================
// USER MANAGEMENT TYPES
// =============================================================================

/**
 * Extended user profile with computed stats for admin view
 */
export interface AdminUserView extends UserProfile {
  email?: string;
  conversation_count?: number;
  message_count?: number;
  total_tokens_used?: number;
  total_cost_cents?: number;
}

// =============================================================================
// USAGE STATISTICS TYPES
// =============================================================================

export interface UsageStats {
  totalTokens: number;
  totalCostCents: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}

export interface UsageByModel {
  model: string;
  tokens: number;
  costCents: number;
  requestCount: number;
}

export interface UsageByPersona {
  personaId: string;
  personaName: string;
  tokens: number;
  costCents: number;
  requestCount: number;
}

export interface UsageByUser {
  userId: string;
  userName: string;
  tokens: number;
  costCents: number;
  requestCount: number;
}

export interface DailyUsage {
  date: string;
  tokens: number;
  costCents: number;
  requestCount: number;
}

export interface UsageSummary {
  today: UsageStats;
  week: UsageStats;
  month: UsageStats;
  allTime: UsageStats;
  byModel: UsageByModel[];
  byPersona: UsageByPersona[];
  topUsers: UsageByUser[];
  dailyTrend: DailyUsage[];
}

// =============================================================================
// APP SETTINGS TYPES
// =============================================================================

export type AppSettingKey =
  | 'default_model'
  | 'max_tokens_per_request'
  | 'daily_token_limit_free'
  | 'daily_token_limit_premium'
  | 'maintenance_mode'
  | 'featured_persona_id'
  | 'cost_markup_percent'
  | 'unified_card_gradient'
  | 'challenge_show_persona_image'
  | 'daily_challenges_batch'
  | 'fullscreen_card_mode'
  | 'focus_mode_chat';

export interface DailyChallengeItem {
  question: string;
  topic: string;
  personaId: string;
  personaName: string;
}

export interface DailyChallengesBatch {
  challenges: DailyChallengeItem[];
  generatedAt: string | null;
  generatedDate: string | null;
}

export interface AppSettingsMap {
  default_model: string;
  max_tokens_per_request: number;
  daily_token_limit_free: number;
  daily_token_limit_premium: number;
  maintenance_mode: boolean;
  featured_persona_id: string | null;
  cost_markup_percent: number;
  unified_card_gradient: boolean;
  challenge_show_persona_image: boolean;
  daily_challenges_batch: DailyChallengesBatch | null;
  fullscreen_card_mode: boolean;
  focus_mode_chat: boolean;
  /**
   * Meta-prompts for AI persona generation. Shared with the web admin so a
   * single edit in /admin/ai-config/persona-generator propagates to both
   * apps. See migration 078 for the canonical shape.
   */
  ai_persona_generator: AiPersonaGeneratorConfig | null;
}

/**
 * Shape of app_settings.ai_persona_generator. Keep in sync with
 * migration 078 and dialectica-admin/src/lib/personas/generator-config.ts.
 *
 * Templates use {{token}} placeholders; the renderer also supports
 * {{var|or 'fallback'}} for graceful empty-field handling.
 */
export interface AiPersonaGeneratorConfig {
  model_settings: {
    temperature: number;
    max_completion_tokens: number;
  };
  details: {
    system: string;
    user_template: string;
  };
  system_prompt: {
    system: string;
    user_template: string;
  };
  sections: {
    _system: string;
    identity: string;
    character_traits: string;
    roleplay_behavior: string;
    coaching_approach: string;
  };
  persona_context_template: string;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  totalConversations: number;
  activePersonas: number;
  tokensToday: number;
  tokensWeek: number;
  tokensMonth: number;
  costToday: number;
  costWeek: number;
  costMonth: number;
}

// =============================================================================
// PERSONA MANAGEMENT TYPES
// =============================================================================

/**
 * Full persona data for editing
 */
export interface AdminPersonaView extends Persona {
  conversation_count?: number;
  message_count?: number;
  total_tokens_used?: number;
}

export type PersonaFormData = Omit<Persona, 'id' | 'created_at'> & {
  id?: string;
};

// =============================================================================
// DATE RANGE TYPES
// =============================================================================

export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (preset) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'all':
    default:
      start = new Date(2020, 0, 1); // Far enough in the past
      break;
  }

  return { start, end, preset };
}
