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
  previewGreeting?: boolean;      // Generate but don't save
  regenerateQuestion?: boolean;   // Regenerate question only
  existingIntro?: string;         // Pass intro when regenerating question
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
    const { conversationId, userMessage, personaId, generateGreeting, previewGreeting, regenerateQuestion, existingIntro } = await req.json() as ChatRequest;

    if (!conversationId || !personaId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId or personaId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!generateGreeting && !previewGreeting && !regenerateQuestion && !userMessage) {
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

    // Parse the value - it's JSON stringified in the DB
    let model = 'llama-3.3-70b-versatile';
    if (modelSetting?.value) {
      try {
        model = JSON.parse(modelSetting.value);
      } catch {
        model = modelSetting.value;
      }
    }
    const systemPrompt = persona.system_prompt;

    console.log('Chat request:', { conversationId, personaId, model, generateGreeting, previewGreeting, regenerateQuestion });
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

    // Helper to get user name for personalization
    async function getUserName(): Promise<string> {
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      if (conv?.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', conv.user_id)
          .single();
        return profile?.display_name || '';
      }
      return '';
    }

    // Helper to generate intro content
    async function generateIntro(userName: string) {
      const formality = persona.formality ?? 50;
      const introStyle = formality >= 60
        ? `Introduce yourself formally as "${persona.name}".`
        : `Introduce yourself casually as "${persona.name}".`;

      const introPrompt = `Write a very brief greeting (1 short sentence only, under 15 words).
${introStyle}${userName ? ` Address the user as "${userName}".` : ''}
Be warm but extremely concise. Do NOT ask questions.`;

      return callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: introPrompt },
      ]);
    }

    // Helper to generate question content
    async function generateQuestion(introContent: string) {
      const questionPrompt = `Ask ONE thought-provoking opening question (1-2 sentences max, under 30 words total). Be direct and intriguing. Do NOT re-introduce yourself or add preamble.`;

      return callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: introContent },
        { role: 'user', content: questionPrompt },
      ]);
    }

    // Handle regenerate question only (preview mode)
    if (regenerateQuestion && existingIntro) {
      const questionResponse = await generateQuestion(existingIntro);
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle preview greeting (generate but don't save)
    if (previewGreeting) {
      const userName = await getUserName();
      const introResponse = await generateIntro(userName);
      const introContent = introResponse.choices[0]?.message?.content || '';
      const questionResponse = await generateQuestion(introContent);
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ intro: introContent, question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle greeting generation (generate and save)
    if (generateGreeting) {
      // Get user name for personalization
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      const userName = await getUserName();
      const introResponse = await generateIntro(userName);
      const introContent = introResponse.choices[0]?.message?.content || '';
      const questionResponse = await generateQuestion(introContent);
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
