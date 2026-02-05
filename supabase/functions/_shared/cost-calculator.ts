/**
 * AI Cost Calculator
 *
 * Utility for calculating AI usage costs based on model pricing.
 * Used by edge functions to calculate costs at insert time.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ModelPricing {
  cost_per_million_input: number;
  cost_per_million_output: number;
}

// Cache for model pricing to avoid repeated DB lookups
const pricingCache: Map<string, { pricing: ModelPricing; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
 * @returns Cost in cents (rounded up)
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  costPerMillionInput: number,
  costPerMillionOutput: number
): number {
  const inputCost = (promptTokens / 1_000_000) * costPerMillionInput;
  const outputCost = (completionTokens / 1_000_000) * costPerMillionOutput;
  return Math.ceil(inputCost + outputCost);
}

/**
 * Calculate AI usage cost by looking up model pricing
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
  const pricing = await getModelPricing(supabase, modelId);

  if (!pricing) {
    return 0;
  }

  return calculateCost(
    promptTokens,
    completionTokens,
    pricing.cost_per_million_input,
    pricing.cost_per_million_output
  );
}

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
  });

  if (error) {
    console.error('Failed to record AI usage:', error);
  }
}
