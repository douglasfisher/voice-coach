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
    const { conversationId, userMessage, personaId, generateGreeting, previewGreeting, regenerateQuestion } = await req.json() as ChatRequest;

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
    // Enhance system prompt with conversational brevity instruction
    const briefnessInstruction = `\n\nIMPORTANT STYLE GUIDE: Keep responses brief (1-2 sentences). Ask ONE thought-provoking follow-up question. Never lecture or explain at length. Be conversational and direct.`;
    const systemPrompt = persona.system_prompt + briefnessInstruction;

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
          max_tokens: persona.ai_config?.max_completion_tokens ?? 150,
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

    // Helper to generate opening question content (no intro, just the question)
    async function generateQuestion() {
      const questionPrompt = `Ask ONE thought-provoking opening question (1-2 sentences max, under 30 words total). Be direct and intriguing. No introduction or preamble needed - just ask the question.`;

      return callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: questionPrompt },
      ]);
    }

    // Handle regenerate question only (preview mode)
    if (regenerateQuestion) {
      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle preview greeting (generate but don't save) - now only generates question
    if (previewGreeting) {
      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle greeting generation (generate and save) - now only saves question
    if (generateGreeting) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      // Save only the question message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: questionContent,
        sequence: 1,
      });

      // Log usage
      await supabase.from('ai_usage').insert({
        user_id: conv?.user_id || null,
        conversation_id: conversationId,
        persona_id: personaId,
        model,
        prompt_tokens: questionResponse.usage?.prompt_tokens || 0,
        completion_tokens: questionResponse.usage?.completion_tokens || 0,
        total_tokens: questionResponse.usage?.total_tokens || 0,
      });

      return new Response(
        JSON.stringify({ response: questionContent, question: questionContent }),
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

    return new Response(
      JSON.stringify({ response: assistantMessage }),
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
