/**
 * Report Edge Function
 *
 * Generates comprehensive session reports for completed conversations.
 * Uses database-driven configuration via resolveAIConfig.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIConfig } from '../_shared/config/ai-config-resolver.ts';
import { processSessionGamification } from '../_shared/gamification/index.ts';
import { recordAIUsage } from '../_shared/cost-calculator.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  conversationId: string;
}

interface TimingMetrics {
  // Session-level metrics
  total_duration_ms: number;
  exchange_count: number;

  // User metrics (primary - reflects actual engagement)
  user_word_count: number;
  user_avg_response_ms: number;
  user_avg_words_per_response: number;

  // AI metrics (diagnostic - for API performance monitoring)
  ai_word_count: number;
  ai_avg_response_ms: number;
}

interface MessageWithTiming {
  role: string;
  content: string;
  sequence: number;
  created_at: string;
  response_time_ms: number | null;
}

function calculateTimingMetrics(
  messages: MessageWithTiming[],
  startedAt: string
): TimingMetrics {
  const endTime = Date.now();
  const startTime = new Date(startedAt).getTime();
  const totalDurationMs = endTime - startTime;

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // User response times (how long user takes to think/respond)
  const userResponseTimes = userMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const avgUserResponse = userResponseTimes.length > 0
    ? Math.round(userResponseTimes.reduce((a, b) => a + b, 0) / userResponseTimes.length)
    : 0;

  // AI response times (diagnostic only - just API latency)
  const aiResponseTimes = assistantMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const avgAiResponse = aiResponseTimes.length > 0
    ? Math.round(aiResponseTimes.reduce((a, b) => a + b, 0) / aiResponseTimes.length)
    : 0;

  // User word count (primary metric - reflects actual user engagement)
  const userWordCount = userMessages.reduce((total, m) => {
    const words = m.content.trim().split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);

  // AI word count (diagnostic - kept separate from user metrics)
  const aiWordCount = assistantMessages.reduce((total, m) => {
    const words = m.content.trim().split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);

  const exchangeCount = userMessages.length;

  return {
    // Session-level
    total_duration_ms: totalDurationMs,
    exchange_count: exchangeCount,

    // User metrics (primary)
    user_word_count: userWordCount,
    user_avg_response_ms: avgUserResponse,
    user_avg_words_per_response: exchangeCount > 0
      ? Math.round(userWordCount / exchangeCount)
      : 0,

    // AI metrics (diagnostic)
    ai_word_count: aiWordCount,
    ai_avg_response_ms: avgAiResponse,
  };
}

interface DimensionScores {
  logical_reasoning: number;
  bias_awareness: number;
  perspective_taking: number;
  emotional_regulation: number;
}

interface SessionReport {
  tldr: string;
  strengths: string[];
  weaknesses: string[];
  detailed_analysis: string;
  overall_score: number;
  dimension_scores: DimensionScores;
  generated_at: string;
}

const REPORT_SYSTEM_PROMPT = `You are an expert coach analyzing a dialectical conversation. Generate a comprehensive session report.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations.

Output format:
{
  "tldr": "1-2 sentence summary of the conversation quality",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["area for improvement 1", "area for improvement 2", "area for improvement 3"],
  "detailed_analysis": "2-3 paragraphs analyzing the user's reasoning, engagement, and growth opportunities",
  "overall_score": 75,
  "dimension_scores": {
    "logical_reasoning": 80,
    "bias_awareness": 70,
    "perspective_taking": 75,
    "emotional_regulation": 72
  }
}

Dimension scoring (0-100 each):
- logical_reasoning: Argument structure, valid inferences, evidence use, logical consistency
- bias_awareness: Recognition of cognitive biases, fair consideration of evidence, avoiding fallacies
- perspective_taking: Willingness to consider alternatives, intellectual humility, openness to challenge
- emotional_regulation: Composure, non-defensive responses, constructive engagement under pressure

Overall score = weighted average of dimension scores.

Scoring guide (0-100):
- 90-100: Exceptional critical thinking, nuanced arguments, intellectual humility
- 75-89: Strong reasoning with minor gaps, good engagement
- 60-74: Decent engagement but logical gaps or missed opportunities
- 40-59: Surface-level thinking, defensive responses, or avoidance
- Below 40: Minimal engagement or poor reasoning

Focus on:
- Logical consistency and soundness of arguments
- Openness to new perspectives
- Quality of questions asked
- Evidence of intellectual growth during conversation
- Recognition of complexity and nuance`;

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
    const { conversationId } = await req.json() as ReportRequest;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation with persona info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, started_at, created_at, personas(name, challenge_style)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve AI config for 'report' task
    const config = await resolveAIConfig(supabase, {
      task: 'report',
      personaId: conversation.persona_id,
    });

    console.log('Report config resolved:', {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_completion_tokens,
    });

    // Fetch all messages with timing data
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content, sequence, created_at, response_time_ms')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (msgError || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate timing metrics
    const timingMetrics = calculateTimingMetrics(
      messages as MessageWithTiming[],
      conversation.started_at || conversation.created_at
    );

    // Build conversation transcript
    const transcript = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const personaInfo = conversation.personas;
    const userPrompt = `Analyze this conversation between a user and ${personaInfo?.name || 'an AI coach'} (style: ${personaInfo?.challenge_style || 'dialectical'}).

CONVERSATION:
${transcript}

Generate a comprehensive session report.`;

    // Call Groq with resolved config
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: REPORT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.max_completion_tokens,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const reportContent = groqData.choices[0]?.message?.content || '';

    // Parse JSON from response
    let report: SessionReport;
    try {
      const jsonMatch = reportContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : reportContent;
      report = JSON.parse(jsonStr.trim());
      report.generated_at = new Date().toISOString();
    } catch (parseError) {
      console.error('Failed to parse report:', reportContent);
      report = {
        tldr: 'Session completed. Analysis could not be generated.',
        strengths: ['Engaged in conversation', 'Completed the session'],
        weaknesses: ['Analysis unavailable'],
        detailed_analysis: 'The session was completed but detailed analysis could not be generated at this time.',
        overall_score: 50,
        dimension_scores: {
          logical_reasoning: 50,
          bias_awareness: 50,
          perspective_taking: 50,
          emotional_regulation: 50,
        },
        generated_at: new Date().toISOString(),
      };
    }

    // Ensure dimension_scores exist with defaults
    if (!report.dimension_scores) {
      report.dimension_scores = {
        logical_reasoning: report.overall_score,
        bias_awareness: report.overall_score,
        perspective_taking: report.overall_score,
        emotional_regulation: report.overall_score,
      };
    }

    // Clamp dimension scores to valid range
    for (const key of Object.keys(report.dimension_scores) as (keyof DimensionScores)[]) {
      report.dimension_scores[key] = Math.max(0, Math.min(100, report.dimension_scores[key] || 50));
    }

    // Ensure score is within bounds
    report.overall_score = Math.max(0, Math.min(100, report.overall_score || 50));

    // Save report and timing metrics to conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        analysis_summary: report,
        overall_score: report.overall_score,
        timing_metrics: timingMetrics,
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to save report:', updateError);
    }

    // Log usage with cost calculation
    if (groqData.usage) {
      await recordAIUsage(supabase, {
        userId: conversation.user_id,
        conversationId: conversationId,
        personaId: conversation.persona_id,
        model: config.model,
        promptTokens: groqData.usage.prompt_tokens,
        completionTokens: groqData.usage.completion_tokens,
        totalTokens: groqData.usage.total_tokens,
      });
    }

    // Process gamification (XP, streaks, achievements, insights)
    let gamificationResult = null;
    try {
      gamificationResult = await processSessionGamification(
        supabase,
        conversation.user_id,
        conversationId,
        {
          overall_score: report.overall_score,
          dimension_scores: report.dimension_scores,
        }
      );
      console.log('Gamification processed:', {
        xpAwarded: gamificationResult.xp.awarded,
        streak: gamificationResult.streak.current,
        achievements: gamificationResult.achievements.length,
      });
    } catch (gamificationError) {
      // Log but don't fail the request - gamification is non-critical
      console.error('Gamification processing error:', gamificationError);
    }

    return new Response(
      JSON.stringify({ report, conversationId, gamification: gamificationResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
