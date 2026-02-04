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

// Default fallback model if persona's model fails
const SYSTEM_FALLBACK_MODEL = 'llama-3.1-8b-instant';


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

    // Build list of models to try: primary -> fallback -> system fallback
    const modelsToTry: string[] = [];
    if (persona.ai_config?.model) {
      modelsToTry.push(persona.ai_config.model);
    }
    if (persona.ai_config?.fallback_model) {
      modelsToTry.push(persona.ai_config.fallback_model);
    }
    modelsToTry.push(SYSTEM_FALLBACK_MODEL);

    // Remove duplicates
    const uniqueModels = [...new Set(modelsToTry)];

    // Base settings from database ai_config
    const baseSettings = {
      temperature: persona.ai_config?.temperature ?? 0.7,
      top_p: persona.ai_config?.top_p ?? 0.9,
      max_completion_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
      stop: persona.ai_config?.stop,
    };

    // Cost config from database (cents per million tokens)
    const costPerMillionInput = persona.ai_config?.cost_per_million_input ?? 0;
    const costPerMillionOutput = persona.ai_config?.cost_per_million_output ?? 0;

    // Helper to try models with fallback
    async function tryWithFallback<T>(
      operation: (model: string) => Promise<T>
    ): Promise<{ result: T; modelUsed: string }> {
      let lastError: Error | null = null;

      for (const model of uniqueModels) {
        try {
          console.log(`Trying model: ${model}`);
          const result = await operation(model);
          return { result, modelUsed: model };
        } catch (error) {
          console.warn(`Model ${model} failed:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
          // Continue to next model
        }
      }

      throw lastError || new Error('All models failed');
    }

    // Settings will be built per-attempt with the current model
    const buildSettings = (model: string): Partial<GroqCompletionSettings> => ({
      model: model as GroqCompletionSettings['model'],
      ...baseSettings,
    });

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
      if (isHighFormality) {
        // Formal: "I'm Dr. Maya Chen..." or "I'm Professor Marcus..."
        const formalName = title ? `${title} ${persona.name}` : persona.name;
        introStyle = `Introduce yourself formally as "${formalName}". Use a professional, measured tone.`;
      } else {
        // Casual: "Hey! I'm Maya..." or "Hi there, I'm Marcus..."
        introStyle = `Introduce yourself casually using just your first name "${persona.name}". Be warm and friendly, like greeting a new friend.`;
      }

      // Add user name if available
      const userGreeting = userName ? ` Address the user by name ("${userName}").` : '';

      // Generate introduction message
      const introPrompt = `You are starting a new conversation. Write ONLY a brief self-introduction (1-2 sentences max).

${introStyle}${userGreeting}

Keep it short and natural. Do NOT ask any questions or propose topics yet.`;

      const { result: introResult, modelUsed } = await tryWithFallback(async (model) => {
        return await groq.completeWithHistoryAndUsage(
          systemPrompt,
          [],
          introPrompt,
          { ...buildSettings(model), temperature: 0.9 }
        );
      });
      const { content: intro, usage: introUsage } = introResult;

      // Generate the opening question as a separate message
      const questionPrompt = `You just introduced yourself. Now propose a specific thought-provoking topic and ask an engaging opening question related to your expertise and challenge style.

Be creative - pick an interesting, unexpected angle on topics like: human nature, society, technology, relationships, success, morality, happiness, decision-making, beliefs, or current events.

Write ONLY the topic introduction and question (2-3 sentences max). Do NOT re-introduce yourself.

Do NOT ask the user what they want to talk about - YOU choose the topic and question.`;

      const { result: questionResult } = await tryWithFallback(async (model) => {
        return await groq.completeWithHistoryAndUsage(
          systemPrompt,
          [{ role: 'assistant', content: intro }],
          questionPrompt,
          { ...buildSettings(model), temperature: 0.9 }
        );
      });
      const { content: question, usage: questionUsage } = questionResult;

      // Save both messages as separate bubbles
      const { error: saveIntroError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: intro,
          sequence: 1,
        });

      if (saveIntroError) {
        console.error('Failed to save intro:', saveIntroError);
      }

      const { error: saveQuestionError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: question,
          sequence: 2,
        });

      if (saveQuestionError) {
        console.error('Failed to save question:', saveQuestionError);
      }

      // Log combined usage
      const totalUsage = {
        prompt_tokens: (introUsage?.prompt_tokens || 0) + (questionUsage?.prompt_tokens || 0),
        completion_tokens: (introUsage?.completion_tokens || 0) + (questionUsage?.completion_tokens || 0),
        total_tokens: (introUsage?.total_tokens || 0) + (questionUsage?.total_tokens || 0),
      };

      if (totalUsage.total_tokens > 0) {
        const inputCost = (totalUsage.prompt_tokens / 1_000_000) * costPerMillionInput;
        const outputCost = (totalUsage.completion_tokens / 1_000_000) * costPerMillionOutput;
        const estimatedCost = Math.ceil((inputCost + outputCost) * 100);

        await supabase.from('ai_usage').insert({
          user_id: conversation?.user_id || null,
          conversation_id: conversationId,
          persona_id: personaId,
          model: modelUsed,
          prompt_tokens: totalUsage.prompt_tokens,
          completion_tokens: totalUsage.completion_tokens,
          total_tokens: totalUsage.total_tokens,
          estimated_cost_cents: estimatedCost,
        });
      }

      // Return both messages
      return jsonResponse({
        response: intro,
        intro,
        question,
      });
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

    // Generate AI response with usage tracking and fallback
    const { result: chatResult, modelUsed: chatModelUsed } = await tryWithFallback(async (model) => {
      return await groq.completeWithHistoryAndUsage(
        systemPrompt,
        conversationMessages,
        userMessage,
        buildSettings(model)
      );
    });
    const { content: assistantMessage, usage } = chatResult;

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
        model: chatModelUsed,
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

    // Extract detailed error message
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for Groq API errors which include responseBody
      if ('responseBody' in error) {
        try {
          const body = JSON.parse((error as any).responseBody);
          errorMessage = body.error?.message || error.message;
        } catch {
          // Use original message if can't parse
        }
      }
    }

    return errorResponse(errorMessage);
  }
});
