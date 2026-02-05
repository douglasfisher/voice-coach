/**
 * Daily Challenge Edge Function
 *
 * Generates a thought-provoking daily challenge question using AI.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIConfig } from '../_shared/config/ai-config-resolver.ts';
import { recordAIUsage } from '../_shared/cost-calculator.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChallengeRequest {
  personaId: string;
}

const CHALLENGE_SYSTEM_PROMPT = `You are a generator of thought-provoking philosophical and ethical questions. Generate ONE unique, engaging question that will challenge someone's assumptions and spark deep thinking.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations.

Output format:
{
  "question": "Your thought-provoking question here?",
  "topic": "Brief topic label (2-3 words)"
}

Guidelines:
- Questions should be open-ended, not yes/no
- Focus on ethics, philosophy, psychology, society, or personal growth
- Make it personally relevant - something people encounter in daily life
- Avoid academic jargon - keep it accessible
- The question should have no single "right" answer
- Make people genuinely want to explore the question

Example topics: Personal Identity, Ethics, Relationships, Success, Happiness, Truth, Freedom, Responsibility, Technology, Society`;

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
    const { personaId } = await req.json() as ChallengeRequest;

    // Resolve AI config
    const config = await resolveAIConfig(supabase, {
      task: 'chat',
      personaId,
    });

    // Generate the challenge question
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: CHALLENGE_SYSTEM_PROMPT },
          { role: 'user', content: 'Generate a unique, thought-provoking question for today.' },
        ],
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const groqData = await response.json();
    const content = groqData.choices[0]?.message?.content || '';

    // Track AI usage
    if (groqData.usage) {
      await recordAIUsage(supabase, {
        userId: null, // Daily challenge is not user-specific
        conversationId: null,
        personaId: personaId || null,
        model: config.model,
        promptTokens: groqData.usage.prompt_tokens,
        completionTokens: groqData.usage.completion_tokens,
        totalTokens: groqData.usage.total_tokens,
        taskType: 'daily_challenge',
      });
    }

    // Parse JSON response
    let result: { question: string; topic: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse challenge:', content);
      result = {
        question: 'What belief do you hold that you\'ve never seriously questioned?',
        topic: 'Self-Reflection',
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily challenge error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
