/**
 * Chat Edge Function
 *
 * Handles conversational AI interactions with personas.
 * All persona configuration is read from the database.
 *
 * Endpoint: POST /functions/v1/chat
 *
 * Request body:
 * {
 *   "conversationId": "uuid",
 *   "userMessage": "string",
 *   "personaId": "uuid"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createGroqClient,
  createSupabaseClient,
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  parseJsonBody,
  requireFields,
  GroqMessage,
  GroqCompletionSettings,
} from '../_shared/index.ts';

interface ChatRequest {
  conversationId: string;
  userMessage: string;
  personaId: string;
}

interface DbPersona {
  id: string;
  name: string;
  challenge_style: string;
  system_prompt: string;
  ai_config: {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_completion_tokens?: number;
    stop?: string[];
  } | null;
}

// Cost per 1 million tokens in USD cents
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 59, output: 79 },
  'llama-3.1-8b-instant': { input: 5, output: 8 },
  'mixtral-8x7b-32768': { input: 24, output: 24 },
  'gemma2-9b-it': { input: 20, output: 20 },
  'llama-guard-3-8b': { input: 20, output: 20 },
};

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['llama-3.3-70b-versatile'];
  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
  return Math.ceil((inputCost + outputCost) * 100); // cents
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
    const { conversationId, userMessage, personaId } = await parseJsonBody<ChatRequest>(req);
    requireFields({ conversationId, userMessage, personaId }, ['conversationId', 'userMessage', 'personaId']);

    // Get persona configuration from database
    const { data: dbPersona, error: personaError } = await supabase
      .from('personas')
      .select('id, name, challenge_style, system_prompt, ai_config')
      .eq('id', personaId)
      .single();

    if (personaError || !dbPersona) {
      console.error('Persona lookup error:', personaError);
      return errorResponse('Persona not found', 404);
    }

    const persona = dbPersona as DbPersona;
    const systemPrompt = persona.system_prompt;

    // Build settings from database ai_config
    const settings: Partial<GroqCompletionSettings> = {
      model: (persona.ai_config?.model as GroqCompletionSettings['model']) || 'llama-3.3-70b-versatile',
      temperature: persona.ai_config?.temperature ?? 0.7,
      top_p: persona.ai_config?.top_p ?? 0.9,
      max_completion_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
      stop: persona.ai_config?.stop,
    };

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (messagesError) {
      return errorResponse('Failed to fetch conversation history', 500);
    }

    // Build conversation context
    const conversationMessages: GroqMessage[] = (messages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get next sequence number
    const nextSequence = (messages?.length || 0) + 1;

    // Save user message
    const { error: saveUserError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        sequence: nextSequence,
      });

    if (saveUserError) {
      console.error('Failed to save user message:', saveUserError);
      return errorResponse('Failed to save user message', 500);
    }

    // Generate AI response with usage tracking
    const { content: assistantMessage, usage } = await groq.completeWithHistoryAndUsage(
      systemPrompt,
      conversationMessages,
      userMessage,
      settings
    );

    // Save assistant message
    const { error: saveAssistantError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        sequence: nextSequence + 1,
      });

    if (saveAssistantError) {
      console.error('Failed to save assistant message:', saveAssistantError);
      // Continue - we have the response, just couldn't save it
    }

    // Get user_id from conversation for usage tracking
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    // Log AI usage for cost tracking
    if (usage) {
      const model = settings.model || 'llama-3.3-70b-versatile';
      const estimatedCost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

      await supabase.from('ai_usage').insert({
        user_id: conversation?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost_cents: estimatedCost,
      }).then(({ error }) => {
        if (error) console.error('Failed to log AI usage:', error);
      });
    }

    // Trigger analysis asynchronously (don't wait for it)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Fire and forget analysis
    fetch(`${supabaseUrl}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        message: userMessage,
        context: conversationMessages.slice(-5),
        conversationId,
        messageSequence: nextSequence,
      }),
    }).catch((err) => console.error('Analysis trigger failed:', err));

    return jsonResponse({
      response: assistantMessage,
      analysis: null, // Analysis happens async
    });

  } catch (error) {
    console.error('Chat error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
