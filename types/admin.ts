/**
 * Admin System Types
 *
 * Types for admin panel functionality including user management,
 * usage tracking, and app settings.
 */

import { UserProfile, Persona, AIUsage, AppSettings } from './database';

// =============================================================================
// MODEL COSTS
// =============================================================================

/**
 * Cost per 1 million tokens in USD cents
 */
export interface ModelCost {
  input: number;
  output: number;
}

export const MODEL_COSTS: Record<string, ModelCost> = {
  'llama-3.3-70b-versatile': { input: 59, output: 79 },    // $0.59/$0.79 per 1M
  'llama-3.1-8b-instant': { input: 5, output: 8 },         // $0.05/$0.08 per 1M
  'mixtral-8x7b-32768': { input: 24, output: 24 },         // $0.24/$0.24 per 1M
  'gemma2-9b-it': { input: 20, output: 20 },               // $0.20/$0.20 per 1M
  'llama-guard-3-8b': { input: 20, output: 20 },           // $0.20/$0.20 per 1M
};

/**
 * Calculate cost in cents for a given model and token counts
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['llama-3.3-70b-versatile'];
  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
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
  | 'featured_persona_id';

export interface AppSettingsMap {
  default_model: string;
  max_tokens_per_request: number;
  daily_token_limit_free: number;
  daily_token_limit_premium: number;
  maintenance_mode: boolean;
  featured_persona_id: string | null;
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
