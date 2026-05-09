/**
 * Mobile-side database types facade.
 *
 * The generated Supabase shape now lives in `@dialectica/db-types` so a
 * single `pnpm --filter @dialectica/db-types gen` updates both apps.
 * This file keeps the mobile-friendly aliases (Persona, Conversation,
 * etc.) so existing imports like `import { Conversation } from
 * '../types/database'` continue to work unchanged.
 *
 * Add new aliases here as needed; never re-declare the Database shape.
 */
import type { Database } from "@dialectica/db-types"
export type { Database, Json } from "@dialectica/db-types"

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type UserProfile = Tables<"user_profiles">
export type UserPreferences = Tables<"user_preferences">
export type Persona = Tables<"personas">
export type Conversation = Tables<"conversations">
export type Message = Tables<"messages">
export type ConversationStarter = Tables<"conversation_starters">
export type DailyChallenge = Tables<"daily_challenges">
export type AnalysisItem = Tables<"analysis_items">
export type UserPattern = Tables<"user_patterns">
export type GrowthSnapshot = Tables<"growth_snapshots">
export type AIUsage = Tables<"ai_usage">
export type AppSettings = Tables<"app_settings">
export type AIModel = Tables<"ai_models">
export type UserProgressDB = Tables<"user_progress">
export type AchievementDB = Tables<"achievements">
export type UserAchievementDB = Tables<"user_achievements">
export type XPTransactionDB = Tables<"xp_transactions">
export type GrowthProjectionDB = Tables<"growth_projections">
export type UserInsightDB = Tables<"user_insights">

// Coaching tables
export type CoachingDomainDB = Tables<"coaching_domains">
export type ScenarioDB = Tables<"scenarios">

// Cost center tables
export type AIBudgetDB = Tables<"ai_budgets">
export type AICostSnapshotDB = Tables<"ai_cost_snapshots">
