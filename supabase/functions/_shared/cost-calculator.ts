/**
 * AI Cost Calculator
 *
 * Utility for calculating AI usage costs based on model pricing.
 * Used by edge functions to calculate costs at insert time.
 * Supports global markup percentage from app_settings.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ModelPricing {
  cost_per_million_input: number;
  cost_per_million_output: number;
}

// Cache for model pricing to avoid repeated DB lookups
const pricingCache: Map<string, { pricing: ModelPricing; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache for markup setting
let markupCache: { value: number; timestamp: number } | null = null;

/**
 * Get cost markup percentage from app_settings with caching
 */
export async function getCostMarkupPercent(
  supabase: SupabaseClient
): Promise<number> {
  // Check cache first
  if (markupCache && Date.now() - markupCache.timestamp < CACHE_TTL_MS) {
    return markupCache.value;
  }

  // Fetch from database
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cost_markup_percent')
    .single();

  const markup = data && !error ? Number(data.value) : 0;
  markupCache = { value: markup, timestamp: Date.now() };

  return markup;
}

/**
 * Get model pricing from database with caching
 */
export async function getModelPricing(
  supabase: SupabaseClient,
  modelId: string
): Promise<ModelPricing | null> {
  // Check cache first
  const cached = pricingCache.get(modelId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.pricing;
  }

  // Fetch from database
  const { data, error } = await supabase
    .from('ai_models')
    .select('cost_per_million_input, cost_per_million_output')
    .eq('id', modelId)
    .single();

  if (error || !data) {
    console.warn(`No pricing found for model: ${modelId}`);
    return null;
  }

  const pricing: ModelPricing = {
    cost_per_million_input: data.cost_per_million_input || 0,
    cost_per_million_output: data.cost_per_million_output || 0,
  };

  // Cache the result
  pricingCache.set(modelId, { pricing, timestamp: Date.now() });

  return pricing;
}

/**
 * Calculate AI usage cost in cents
 *
 * @param promptTokens - Number of input/prompt tokens
 * @param completionTokens - Number of output/completion tokens
 * @param costPerMillionInput - Cost in cents per million input tokens
 * @param costPerMillionOutput - Cost in cents per million output tokens
 * @param markupPercent - Optional markup percentage (default 0)
 * @returns Cost in cents (rounded up)
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  costPerMillionInput: number,
  costPerMillionOutput: number,
  markupPercent: number = 0
): number {
  const inputCost = (promptTokens / 1_000_000) * costPerMillionInput;
  const outputCost = (completionTokens / 1_000_000) * costPerMillionOutput;
  const baseCost = inputCost + outputCost;
  const withMarkup = baseCost * (1 + markupPercent / 100);
  return Math.ceil(withMarkup);
}

/**
 * Calculate AI usage cost by looking up model pricing and applying markup
 *
 * @param supabase - Supabase client
 * @param modelId - Model ID to look up pricing
 * @param promptTokens - Number of input/prompt tokens
 * @param completionTokens - Number of output/completion tokens
 * @returns Cost in cents (rounded up), or 0 if pricing not found
 */
export async function calculateAICost(
  supabase: SupabaseClient,
  modelId: string,
  promptTokens: number,
  completionTokens: number
): Promise<number> {
  const [pricing, markupPercent] = await Promise.all([
    getModelPricing(supabase, modelId),
    getCostMarkupPercent(supabase),
  ]);

  if (!pricing) {
    return 0;
  }

  return calculateCost(
    promptTokens,
    completionTokens,
    pricing.cost_per_million_input,
    pricing.cost_per_million_output,
    markupPercent
  );
}

/**
 * Task types for service breakdown tracking
 */
export type AITaskType =
  | 'chat'             // Regular chat messages
  | 'greeting'         // Initial greeting generation
  | 'report'           // Session report generation
  | 'analyze'          // Message analysis
  | 'daily_challenge'  // Daily challenge question
  | 'coaching'         // Coaching roleplay
  | 'feedback'         // Coaching feedback
  | 'complete'         // Generic completion
  | 'scenario'         // Q&A scenario generation
  | 'image_generation' // Avatar image generation (Runware)
  | 'tts'              // Text-to-speech (ElevenLabs)
  | 'unknown';         // Fallback

/**
 * Insert AI usage record with calculated cost
 */
export async function recordAIUsage(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    conversationId?: string | null;
    personaId?: string | null;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    taskType?: AITaskType;
    /** Wall-clock duration of the provider request in ms. Optional —
     * callers that don't time themselves (e.g. image generation where
     * latency includes user-side upload time) leave it null. */
    latencyMs?: number | null;
  }
): Promise<void> {
  const costCents = await calculateAICost(
    supabase,
    params.model,
    params.promptTokens,
    params.completionTokens
  );

  const { error } = await supabase.from('ai_usage').insert({
    user_id: params.userId || null,
    conversation_id: params.conversationId || null,
    persona_id: params.personaId || null,
    model: params.model,
    prompt_tokens: params.promptTokens,
    completion_tokens: params.completionTokens,
    total_tokens: params.totalTokens,
    estimated_cost_cents: costCents,
    task_type: params.taskType || 'unknown',
    latency_ms: params.latencyMs ?? null,
  });

  if (error) {
    console.error('Failed to record AI usage:', error);
  }
}
