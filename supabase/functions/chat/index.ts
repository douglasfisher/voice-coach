/**
 * Chat Edge Function - Single file, self-contained
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  conversationId: string;
  userMessage?: string;
  personaId: string;
  generateGreeting?: boolean;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { conversationId, userMessage, personaId, generateGreeting } = await req.json() as ChatRequest;

    if (!conversationId || !personaId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId or personaId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!generateGreeting && !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get persona
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('id, name, challenge_style, system_prompt, formality, ai_config')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      return new Response(
        JSON.stringify({ error: 'Persona not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get default model from app_settings
    const { data: modelSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_model')
      .single();

    const model = modelSetting?.value || 'llama-3.3-70b-versatile';
    const systemPrompt = persona.system_prompt;

    console.log('Chat request:', { conversationId, personaId, model, generateGreeting });
    console.log('Model from DB:', modelSetting?.value);
    console.log('Final model being used:', model);

    // Helper to call Groq
    async function callGroq(messages: GroqMessage[]) {
      console.log('Calling Groq with model:', model);
      console.log('API Key prefix:', groqApiKey?.slice(0, 15));
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: persona.ai_config?.temperature ?? 0.7,
          max_tokens: persona.ai_config?.max_completion_tokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq error status:', response.status);
        console.error('Groq error body:', errorText);
        console.error('Request model was:', model);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }

    // Handle greeting generation
    if (generateGreeting) {
      // Get user name for personalization
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      let userName = '';
      if (conv?.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', conv.user_id)
          .single();
        userName = profile?.display_name || '';
      }

      const formality = persona.formality ?? 50;
      const introStyle = formality >= 60
        ? `Introduce yourself formally as "${persona.name}".`
        : `Introduce yourself casually as "${persona.name}".`;

      // Generate intro
      const introPrompt = `Write ONLY a brief self-introduction (1-2 sentences).
${introStyle}${userName ? ` Address the user as "${userName}".` : ''}
Keep it short and natural. Do NOT ask questions yet.`;

      const introResponse = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: introPrompt },
      ]);
      const introContent = introResponse.choices[0]?.message?.content || '';

      // Generate question
      const questionPrompt = `You just introduced yourself. Now propose a thought-provoking topic and ask an engaging opening question. 2-3 sentences max. Do NOT re-introduce yourself.`;

      const questionResponse = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: introContent },
        { role: 'user', content: questionPrompt },
      ]);
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      // Save messages
      await supabase.from('messages').insert([
        { conversation_id: conversationId, role: 'assistant', content: introContent, sequence: 1 },
        { conversation_id: conversationId, role: 'assistant', content: questionContent, sequence: 2 },
      ]);

      // Log usage
      const totalPromptTokens = (introResponse.usage?.prompt_tokens || 0) + (questionResponse.usage?.prompt_tokens || 0);
      const totalCompletionTokens = (introResponse.usage?.completion_tokens || 0) + (questionResponse.usage?.completion_tokens || 0);

      await supabase.from('ai_usage').insert({
        user_id: conv?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model,
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalPromptTokens + totalCompletionTokens,
      });

      return new Response(
        JSON.stringify({ response: introContent, intro: introContent, question: questionContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular message handling
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    const history: GroqMessage[] = (messages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const nextSequence = (messages?.length || 0) + 1;

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      sequence: nextSequence,
    });

    // Generate response
    const groqResponse = await callGroq([
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage! },
    ]);

    const assistantMessage = groqResponse.choices[0]?.message?.content || '';

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
      sequence: nextSequence + 1,
    });

    // Get user_id and log usage
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (groqResponse.usage) {
      await supabase.from('ai_usage').insert({
        user_id: conversation?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model,
        prompt_tokens: groqResponse.usage.prompt_tokens,
        completion_tokens: groqResponse.usage.completion_tokens,
        total_tokens: groqResponse.usage.total_tokens,
      });
    }

    // Trigger analysis async
    fetch(`${supabaseUrl}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        message: userMessage,
        context: history.slice(-5),
        conversationId,
        messageSequence: nextSequence,
      }),
    }).catch((err) => console.error('Analysis trigger failed:', err));

    return new Response(
      JSON.stringify({ response: assistantMessage, analysis: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
