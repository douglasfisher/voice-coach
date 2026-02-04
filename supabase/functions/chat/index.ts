/**
 * Chat Edge Function
 *
 * Uses database-driven configuration via resolveAIConfig.
 * All AI behavior is controlled by app_settings and persona.ai_config.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIConfig } from '../_shared/config/ai-config-resolver.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  conversationId?: string;
  userMessage?: string;
  personaId: string;
  generateGreeting?: boolean;
  previewGreeting?: boolean;
  regenerateQuestion?: boolean;
  generateChallenge?: boolean;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
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

    const {
      conversationId,
      userMessage,
      personaId,
      generateGreeting,
      previewGreeting,
      regenerateQuestion,
    } = await req.json() as ChatRequest;

    // Handle challenge generation (doesn't require conversationId)
    if (generateChallenge) {
      // Fetch challenge prompt from app_settings
      const { data: challengeSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_challenge_prompt')
        .single();

      const challengePrompt = challengeSettings?.value || `You are a generator of thought-provoking philosophical and ethical questions. Generate ONE unique, engaging question that will challenge someone's assumptions and spark deep thinking.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations.

Output format:
{"question": "Your thought-provoking question here?", "topic": "Brief topic label (2-3 words)"}

Guidelines:
- Questions should be open-ended, not yes/no
- Focus on ethics, philosophy, psychology, society, or personal growth
- Make it personally relevant - something people encounter in daily life
- Avoid academic jargon - keep it accessible
- The question should have no single "right" answer`;

      const config = await resolveAIConfig(supabase, {
        task: 'challenge',
        personaId,
      });

      const challengeResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: challengePrompt },
            { role: 'user', content: 'Generate a unique, thought-provoking question for today.' },
          ],
          temperature: 0.9,
          max_tokens: 150,
        }),
      });

      if (!challengeResponse.ok) {
        throw new Error(`Groq API error: ${challengeResponse.status}`);
      }

      const challengeData = await challengeResponse.json();
      const content = challengeData.choices[0]?.message?.content || '';

      let result: { question: string; topic: string };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch {
        result = {
          question: "What belief do you hold that you've never seriously questioned?",
          topic: 'Self-Reflection',
        };
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Resolve AI config from database (global + persona settings)
    const config = await resolveAIConfig(supabase, {
      task: 'chat',
      personaId,
    });

    console.log('Chat config resolved:', {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_completion_tokens,
      personaId,
    });

    // Helper to call Groq using resolved config
    async function callGroq(messages: GroqMessage[]) {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          top_p: config.top_p,
          max_tokens: config.max_completion_tokens,
          stop: config.stop,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq error:', response.status, errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }

    // Helper to generate opening question
    async function generateQuestion() {
      const questionPrompt = `Ask ONE thought-provoking opening question (1-2 sentences max). Be direct and intriguing. No introduction - just the question.`;

      return callGroq([
        { role: 'system', content: config.full_system_prompt },
        { role: 'user', content: questionPrompt },
      ]);
    }

    // Handle regenerate question (preview mode)
    if (regenerateQuestion) {
      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle preview greeting
    if (previewGreeting) {
      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ question: questionContent, preview: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle greeting generation (save to DB)
    if (generateGreeting) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: questionContent,
        sequence: 1,
      });

      if (questionResponse.usage) {
        await supabase.from('ai_usage').insert({
          user_id: conv?.user_id || null,
          conversation_id: conversationId,
          persona_id: personaId,
          model: config.model,
          prompt_tokens: questionResponse.usage.prompt_tokens,
          completion_tokens: questionResponse.usage.completion_tokens,
          total_tokens: questionResponse.usage.total_tokens,
        });
      }

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
      { role: 'system', content: config.full_system_prompt },
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

    // Log usage
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
        model: config.model,
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
