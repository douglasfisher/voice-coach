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
  userMessage?: string;
  personaId: string;
  generateGreeting?: boolean;
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
    cost_per_million_input?: number;
    cost_per_million_output?: number;
  } | null;
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
    const { conversationId, userMessage, personaId, generateGreeting } = await parseJsonBody<ChatRequest>(req);
    requireFields({ conversationId, personaId }, ['conversationId', 'personaId']);

    // If not generating greeting, userMessage is required
    if (!generateGreeting && !userMessage) {
      return errorResponse('userMessage is required when not generating greeting', 400);
    }

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

    // Model must be configured in database
    if (!persona.ai_config?.model) {
      return errorResponse('Persona AI model not configured in database', 500);
    }

    // Build settings from database ai_config
    const settings: Partial<GroqCompletionSettings> = {
      model: persona.ai_config.model as GroqCompletionSettings['model'],
      temperature: persona.ai_config?.temperature ?? 0.7,
      top_p: persona.ai_config?.top_p ?? 0.9,
      max_completion_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
      stop: persona.ai_config?.stop,
    };

    // Cost config from database (cents per million tokens)
    const costPerMillionInput = persona.ai_config?.cost_per_million_input ?? 0;
    const costPerMillionOutput = persona.ai_config?.cost_per_million_output ?? 0;

    // Handle greeting generation
    if (generateGreeting) {
      const greetingPrompt = `You are starting a new conversation. Introduce yourself briefly (just your first name), then propose a specific thought-provoking topic and ask an engaging opening question related to your expertise and challenge style.

Be creative - pick an interesting, unexpected angle on topics like: human nature, society, technology, relationships, success, morality, happiness, decision-making, beliefs, or current events.

Keep it conversational and warm but intellectually stimulating. The greeting should be 2-3 sentences max. End with your question.

Do NOT ask the user what they want to talk about - YOU choose the topic and question.`;

      const { content: greeting, usage } = await groq.completeWithHistoryAndUsage(
        systemPrompt,
        [],
        greetingPrompt,
        { ...settings, temperature: 0.9 } // Higher temperature for variety
      );

      // Save the greeting as the first message
      const { error: saveGreetingError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: greeting,
          sequence: 1,
        });

      if (saveGreetingError) {
        console.error('Failed to save greeting:', saveGreetingError);
      }

      // Log usage
      if (usage) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .single();

        const inputCost = (usage.prompt_tokens / 1_000_000) * costPerMillionInput;
        const outputCost = (usage.completion_tokens / 1_000_000) * costPerMillionOutput;
        const estimatedCost = Math.ceil((inputCost + outputCost) * 100);

        await supabase.from('ai_usage').insert({
          user_id: conversation?.user_id || null,
          conversation_id: conversationId,
          persona_id: personaId,
          model: settings.model,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost_cents: estimatedCost,
        });
      }

      return jsonResponse({ response: greeting });
    }

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
      const inputCost = (usage.prompt_tokens / 1_000_000) * costPerMillionInput;
      const outputCost = (usage.completion_tokens / 1_000_000) * costPerMillionOutput;
      const estimatedCost = Math.ceil((inputCost + outputCost) * 100);

      await supabase.from('ai_usage').insert({
        user_id: conversation?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model: settings.model,
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
