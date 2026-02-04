/**
 * Report Edge Function
 *
 * Generates comprehensive session reports for completed conversations.
 * Uses database-driven configuration via resolveAIConfig.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIConfig } from '../_shared/config/ai-config-resolver.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  conversationId: string;
}

interface SessionReport {
  tldr: string;
  strengths: string[];
  weaknesses: string[];
  detailed_analysis: string;
  overall_score: number;
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
  "overall_score": 75
}

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
      .select('*, personas(name, challenge_style)')
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

    // Fetch all messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content, sequence')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (msgError || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        generated_at: new Date().toISOString(),
      };
    }

    // Ensure score is within bounds
    report.overall_score = Math.max(0, Math.min(100, report.overall_score || 50));

    // Save report to conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        analysis_summary: report,
        overall_score: report.overall_score,
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to save report:', updateError);
    }

    // Log usage
    if (groqData.usage) {
      await supabase.from('ai_usage').insert({
        user_id: conversation.user_id,
        conversation_id: conversationId,
        model: config.model,
        prompt_tokens: groqData.usage.prompt_tokens,
        completion_tokens: groqData.usage.completion_tokens,
        total_tokens: groqData.usage.total_tokens,
      });
    }

    return new Response(
      JSON.stringify({ report, conversationId }),
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
