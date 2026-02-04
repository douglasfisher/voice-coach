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
  formality: number;
  title: string | null;
  ai_config: {
    model?: string;
    fallback_model?: string;
    temperature?: number;
    top_p?: number;
    max_completion_tokens?: number;
    stop?: string[];
    cost_per_million_input?: number;
    cost_per_million_output?: number;
  } | null;
}

// Default model - this is known to work
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

// Cost per 1 million tokens in USD cents
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 59, output: 79 },
  'llama-3.1-8b-instant': { input: 5, output: 8 },
  'mixtral-8x7b-32768': { input: 24, output: 24 },
  'gemma2-9b-it': { input: 20, output: 20 },
};

function getCosts(model: string) {
  return MODEL_COSTS[model] || MODEL_COSTS[DEFAULT_MODEL];
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
      .select('id, name, challenge_style, system_prompt, formality, title, ai_config')
      .eq('id', personaId)
      .single();

    if (personaError || !dbPersona) {
      console.error('Persona lookup error:', personaError);
      return errorResponse('Persona not found', 404);
    }

    const persona = dbPersona as DbPersona;
    const systemPrompt = persona.system_prompt;

    // Get model from persona config, with fallbacks
    const primaryModel = persona.ai_config?.model || DEFAULT_MODEL;
    const fallbackModel = persona.ai_config?.fallback_model || FALLBACK_MODEL;

    // Build settings from database ai_config
    const baseSettings = {
      temperature: persona.ai_config?.temperature ?? 0.7,
      top_p: persona.ai_config?.top_p ?? 0.9,
      max_completion_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
      stop: persona.ai_config?.stop,
    };

    // Helper function to try a model with fallback
    async function tryCompletion(
      systemPrompt: string,
      history: GroqMessage[],
      userPrompt: string,
      extraSettings?: Partial<GroqCompletionSettings>
    ): Promise<{ content: string; usage: any; modelUsed: string }> {
      const models = [primaryModel, fallbackModel];
      let lastError: Error | null = null;

      for (const model of models) {
        try {
          const settings: Partial<GroqCompletionSettings> = {
            model: model as GroqCompletionSettings['model'],
            ...baseSettings,
            ...extraSettings,
          };
          const result = await groq.completeWithHistoryAndUsage(
            systemPrompt,
            history,
            userPrompt,
            settings
          );
          return { ...result, modelUsed: model };
        } catch (error) {
          console.error(`Model ${model} failed:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      throw lastError || new Error('All models failed');
    }

    // Handle greeting generation
    if (generateGreeting) {
      // Get user info for personalized greeting
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      let userName = '';
      if (conversation?.user_id) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', conversation.user_id)
          .single();
        userName = userProfile?.display_name || '';
      }

      // Determine intro style based on formality (0-100 scale)
      const formality = persona.formality ?? 50;
      const title = persona.title || '';
      const isHighFormality = formality >= 60;

      // Build intro style guidance
      let introStyle: string;
      if (isHighFormality && title) {
        introStyle = `Introduce yourself formally as "${title} ${persona.name}". Use a professional, measured tone.`;
      } else {
        introStyle = `Introduce yourself casually using just your first name "${persona.name}". Be warm and friendly.`;
      }

      const userGreeting = userName ? ` Address the user by name ("${userName}").` : '';

      // Generate introduction message
      const introPrompt = `You are starting a new conversation. Write ONLY a brief self-introduction (1-2 sentences max).

${introStyle}${userGreeting}

Keep it short and natural. Do NOT ask any questions or propose topics yet.`;

      const introResult = await tryCompletion(systemPrompt, [], introPrompt, { temperature: 0.9 });

      // Generate the opening question as a separate message
      const questionPrompt = `You just introduced yourself. Now propose a specific thought-provoking topic and ask an engaging opening question related to your expertise and challenge style.

Be creative - pick an interesting, unexpected angle on topics like: human nature, society, technology, relationships, success, morality, happiness, decision-making, beliefs, or current events.

Write ONLY the topic introduction and question (2-3 sentences max). Do NOT re-introduce yourself.

Do NOT ask the user what they want to talk about - YOU choose the topic and question.`;

      const questionResult = await tryCompletion(
        systemPrompt,
        [{ role: 'assistant', content: introResult.content }],
        questionPrompt,
        { temperature: 0.9 }
      );

      // Save both messages as separate bubbles
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: introResult.content,
        sequence: 1,
      });

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: questionResult.content,
        sequence: 2,
      });

      // Log usage
      const totalUsage = {
        prompt_tokens: (introResult.usage?.prompt_tokens || 0) + (questionResult.usage?.prompt_tokens || 0),
        completion_tokens: (introResult.usage?.completion_tokens || 0) + (questionResult.usage?.completion_tokens || 0),
        total_tokens: (introResult.usage?.total_tokens || 0) + (questionResult.usage?.total_tokens || 0),
      };

      if (totalUsage.total_tokens > 0) {
        const costs = getCosts(introResult.modelUsed);
        const estimatedCost = Math.ceil(
          ((totalUsage.prompt_tokens / 1_000_000) * costs.input +
            (totalUsage.completion_tokens / 1_000_000) * costs.output) * 100
        );

        await supabase.from('ai_usage').insert({
          user_id: conversation?.user_id || null,
          conversation_id: conversationId,
          persona_id: personaId,
          model: introResult.modelUsed,
          prompt_tokens: totalUsage.prompt_tokens,
          completion_tokens: totalUsage.completion_tokens,
          total_tokens: totalUsage.total_tokens,
          estimated_cost_cents: estimatedCost,
        });
      }

      return jsonResponse({
        response: introResult.content,
        intro: introResult.content,
        question: questionResult.content,
      });
    }

    // Regular message handling
    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (messagesError) {
      return errorResponse('Failed to fetch conversation history', 500);
    }

    const conversationMessages: GroqMessage[] = (messages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

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

    // Generate AI response
    const chatResult = await tryCompletion(systemPrompt, conversationMessages, userMessage!);

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: chatResult.content,
      sequence: nextSequence + 1,
    });

    // Get user_id for usage tracking
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    // Log AI usage
    if (chatResult.usage) {
      const costs = getCosts(chatResult.modelUsed);
      const estimatedCost = Math.ceil(
        ((chatResult.usage.prompt_tokens / 1_000_000) * costs.input +
          (chatResult.usage.completion_tokens / 1_000_000) * costs.output) * 100
      );

      await supabase.from('ai_usage').insert({
        user_id: conversation?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model: chatResult.modelUsed,
        prompt_tokens: chatResult.usage.prompt_tokens,
        completion_tokens: chatResult.usage.completion_tokens,
        total_tokens: chatResult.usage.total_tokens,
        estimated_cost_cents: estimatedCost,
      });
    }

    // Trigger analysis asynchronously
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceKey) {
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
    }

    return jsonResponse({
      response: chatResult.content,
      analysis: null,
    });

  } catch (error) {
    console.error('Chat error:', error);

    let errorMessage = 'Chat service error';
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('responseBody' in error) {
        try {
          const body = JSON.parse((error as any).responseBody);
          errorMessage = body.error?.message || error.message;
        } catch {
          // Use original
        }
      }
    }

    return errorResponse(errorMessage, 500);
  }
});
