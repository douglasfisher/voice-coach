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
  formality?: number;
  ai_config: {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_completion_tokens?: number;
    stop?: string[];
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  console.log('=== Chat function invoked ===');
  console.log('GROQ_API_KEY present:', !!Deno.env.get('GROQ_API_KEY'));
  console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'));
  console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

  try {
    // Initialize clients
    console.log('Creating Groq client...');
    const groq = createGroqClient();
    console.log('Groq client created');

    console.log('Creating Supabase client...');
    const supabase = createSupabaseClient();
    console.log('Supabase client created');

    // Parse and validate request
    const { conversationId, userMessage, personaId, generateGreeting } = await parseJsonBody<ChatRequest>(req);

    // Validate required fields based on request type
    if (generateGreeting) {
      requireFields({ conversationId, personaId }, ['conversationId', 'personaId']);
    } else {
      requireFields({ conversationId, userMessage, personaId }, ['conversationId', 'userMessage', 'personaId']);
    }

    // Get persona configuration from database
    const { data: dbPersona, error: personaError } = await supabase
      .from('personas')
      .select('id, name, challenge_style, system_prompt, formality, ai_config')
      .eq('id', personaId)
      .single();

    if (personaError || !dbPersona) {
      console.error('Persona lookup error:', personaError);
      return errorResponse('Persona not found', 404);
    }

    const persona = dbPersona as DbPersona;
    const systemPrompt = persona.system_prompt;

    // Fetch global default model from app_settings
    const { data: defaultModelSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_model')
      .single();

    const globalDefaultModel = defaultModelSetting?.value || 'llama-3.1-8b-instant';

    // Build settings - use global default, persona ai_config only for temperature/tokens
    const settings: Partial<GroqCompletionSettings> = {
      model: (globalDefaultModel as GroqCompletionSettings['model']),
      temperature: persona.ai_config?.temperature ?? 0.7,
      top_p: persona.ai_config?.top_p ?? 0.9,
      max_completion_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
      stop: persona.ai_config?.stop,
    };

    console.log('=== AI Model Configuration ===');
    console.log('Persona:', persona.name);
    console.log('Global default model:', globalDefaultModel);
    console.log('Model being used:', settings.model);
    console.log('Temperature:', settings.temperature);
    console.log('Persona ai_config:', JSON.stringify(persona.ai_config));

    // Handle greeting generation for new conversations
    if (generateGreeting) {
      console.log('Generating greeting for conversation:', conversationId);

      try {
        // Get user info for personalized greeting
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Failed to get conversation:', convError);
          return errorResponse('Failed to get conversation: ' + convError.message, 500);
        }

        let userName = '';
        if (conv?.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('id', conv.user_id)
            .single();
          userName = profile?.display_name || '';
        }

        console.log('User name:', userName, 'Persona:', persona.name);

        // Generate intro based on formality
        const formality = persona.formality ?? 50;
        const introStyle = formality >= 60
          ? `Introduce yourself formally as "${persona.name}".`
          : `Introduce yourself casually as "${persona.name}".`;

        const introPrompt = `Write ONLY a brief self-introduction (1-2 sentences).
${introStyle}${userName ? ` Address the user as "${userName}".` : ''}
Keep it short and natural. Do NOT ask questions yet.`;

        console.log('Calling Groq for intro...');
        const intro = await groq.completeWithHistoryAndUsage(systemPrompt, [], introPrompt, settings);
        console.log('Intro generated:', intro.content.slice(0, 50));

        const questionPrompt = `You just introduced yourself. Now propose a thought-provoking topic and ask an engaging opening question. 2-3 sentences max. Do NOT re-introduce yourself.`;

        console.log('Calling Groq for question...');
        const question = await groq.completeWithHistoryAndUsage(
          systemPrompt,
          [{ role: 'assistant', content: intro.content }],
          questionPrompt,
          settings
        );
        console.log('Question generated:', question.content.slice(0, 50));

        // Save messages
        const { error: insertError } = await supabase.from('messages').insert([
          { conversation_id: conversationId, role: 'assistant', content: intro.content, sequence: 1 },
          { conversation_id: conversationId, role: 'assistant', content: question.content, sequence: 2 },
        ]);

        if (insertError) {
          console.error('Failed to insert messages:', insertError);
          return errorResponse('Failed to save greeting messages: ' + insertError.message, 500);
        }

        // Log AI usage
        const totalPromptTokens = (intro.usage?.prompt_tokens || 0) + (question.usage?.prompt_tokens || 0);
        const totalCompletionTokens = (intro.usage?.completion_tokens || 0) + (question.usage?.completion_tokens || 0);

        await supabase.from('ai_usage').insert({
          user_id: conv?.user_id || null,
          conversation_id: conversationId,
          persona_id: personaId,
          model: settings.model,
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          total_tokens: totalPromptTokens + totalCompletionTokens,
        }).then(({ error }) => {
          if (error) console.error('Failed to log AI usage:', error);
        });

        console.log('Greeting generation complete');
        return jsonResponse({
          response: intro.content,
          intro: intro.content,
          question: question.content,
        });
      } catch (greetingError) {
        console.error('Greeting generation error:', greetingError);
        return errorResponse(
          greetingError instanceof Error ? greetingError.message : 'Failed to generate greeting',
          500
        );
      }
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

    // Log AI usage
    if (usage) {
      await supabase.from('ai_usage').insert({
        user_id: conversation?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model: settings.model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
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
