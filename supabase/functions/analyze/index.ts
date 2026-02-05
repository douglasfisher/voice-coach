/**
 * Analyze Edge Function
 *
 * Analyzes messages for cognitive biases, logical fallacies, and strengths.
 * Uses the unified AI service internally.
 *
 * Endpoint: POST /functions/v1/analyze
 *
 * Request body:
 * {
 *   "message": "string to analyze",
 *   "context": [{ role, content }],  // optional
 *   "conversationId": "uuid",        // optional - to save results
 *   "messageSequence": number        // optional - to save results
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createGroqClient,
  createSupabaseClient,
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_SETTINGS,
  buildAnalysisUserPrompt,
  DEFAULT_ANALYSIS,
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  parseJsonBody,
  requireFields,
  AnalysisResult,
} from '../_shared/index.ts';
import { recordAIUsage } from '../_shared/cost-calculator.ts';

interface AnalyzeRequest {
  message: string;
  context?: { role: string; content: string }[];
  conversationId?: string;
  messageSequence?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Initialize clients
    const groq = createGroqClient();
    const supabase = createSupabaseClient();

    // Parse and validate request
    const request = await parseJsonBody<AnalyzeRequest>(req);
    requireFields(request, ['message']);

    // Get default model from app_settings
    const { data: modelSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_model')
      .single();

    const model = modelSetting?.value || 'llama-3.3-70b-versatile';

    // Build the analysis prompt
    const userPrompt = buildAnalysisUserPrompt(request.message, request.context);

    // Get analysis from AI with usage tracking
    const { parsed: analysis, usage, model: usedModel } = await groq.completeJSONWithUsage<AnalysisResult>(
      ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      { ...ANALYSIS_SETTINGS, model }
    );

    // Track AI usage
    if (usage) {
      await recordAIUsage(supabase, {
        userId: null, // Analysis doesn't have direct user context
        conversationId: request.conversationId || null,
        personaId: null,
        model: usedModel || model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        taskType: 'analyze',
      });
    }

    // Use parsed result or fallback
    const result = analysis || DEFAULT_ANALYSIS;

    // If conversation context provided, save analysis to message
    if (request.conversationId && request.messageSequence) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ analysis: result })
        .eq('conversation_id', request.conversationId)
        .eq('sequence', request.messageSequence);

      if (updateError) {
        console.error('Failed to save analysis:', updateError);
        // Don't fail the request - analysis was still generated
      }
    }

    return jsonResponse(result);

  } catch (error) {
    console.error('Analysis error:', error);

    // Return default analysis on error - don't break the chat flow
    return jsonResponse(DEFAULT_ANALYSIS);
  }
});
