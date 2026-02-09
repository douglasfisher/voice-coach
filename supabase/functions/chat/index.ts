/**
 * Chat Edge Function
 *
 * Uses database-driven configuration via resolveAIConfig.
 * All AI behavior is controlled by app_settings and persona.ai_config.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAIConfig, CoachingContext } from '../_shared/config/ai-config-resolver.ts';
import { generateSceneContext, getQuickFeedbackPrompt } from '../_shared/config/coaching-prompts.ts';
import { recordAIUsage, calculateAICost } from '../_shared/cost-calculator.ts';
import { processSessionGamification } from '../_shared/gamification/index.ts';

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
  generateScenario?: boolean;
  generateReport?: boolean;
  // Coaching-specific fields
  scenarioId?: string;
  interactionMode?: 'coach_leads' | 'user_leads' | 'turn_taking' | 'question_mode';
  currentPhase?: 'roleplay' | 'feedback';
  scenarioVariant?: { name: string; context: string };
  requestQuickFeedback?: boolean;
  switchPhase?: 'roleplay' | 'feedback';
  promptTokens?: Record<string, string>;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

function buildAIUsageMetadata(usage: GroqUsage, model: string, taskType: string, costCents: number) {
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    cost_cents: costCents,
    model,
    task_type: taskType,
  };
}

// --- Report types & helpers (merged from report function) ---

interface TimingMetrics {
  total_duration_ms: number;
  exchange_count: number;
  user_word_count: number;
  user_avg_response_ms: number;
  user_avg_words_per_response: number;
  ai_word_count: number;
  ai_avg_response_ms: number;
}

interface MessageWithTiming {
  role: string;
  content: string;
  sequence: number;
  created_at: string;
  response_time_ms: number | null;
  metadata?: Record<string, unknown> | null;
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

function calculateTimingMetrics(
  messages: MessageWithTiming[],
  startedAt: string
): TimingMetrics {
  const endTime = Date.now();
  const startTime = new Date(startedAt).getTime();
  const totalDurationMs = endTime - startTime;

  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const userResponseTimes = userMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const avgUserResponse = userResponseTimes.length > 0
    ? Math.round(userResponseTimes.reduce((a, b) => a + b, 0) / userResponseTimes.length)
    : 0;

  const aiResponseTimes = assistantMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const avgAiResponse = aiResponseTimes.length > 0
    ? Math.round(aiResponseTimes.reduce((a, b) => a + b, 0) / aiResponseTimes.length)
    : 0;

  const userWordCount = userMessages.reduce((total, m) => {
    const words = m.content.trim().split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);

  const aiWordCount = assistantMessages.reduce((total, m) => {
    const words = m.content.trim().split(/\s+/).filter(w => w.length > 0);
    return total + words.length;
  }, 0);

  const exchangeCount = userMessages.length;

  return {
    total_duration_ms: totalDurationMs,
    exchange_count: exchangeCount,
    user_word_count: userWordCount,
    user_avg_response_ms: avgUserResponse,
    user_avg_words_per_response: exchangeCount > 0
      ? Math.round(userWordCount / exchangeCount)
      : 0,
    ai_word_count: aiWordCount,
    ai_avg_response_ms: avgAiResponse,
  };
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
      generateChallenge,
      generateScenario,
      generateReport,
      // Coaching fields
      scenarioId,
      interactionMode,
      currentPhase,
      scenarioVariant,
      requestQuickFeedback,
      switchPhase,
      promptTokens,
    } = await req.json() as ChatRequest;

    // Handle challenge generation (doesn't require conversationId)
    if (generateChallenge) {
      // Fetch challenge prompt from app_settings
      const { data: challengeSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_challenge_prompt')
        .single();

      if (!challengeSettings?.value) {
        return new Response(
          JSON.stringify({ error: 'Challenge prompt not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const challengePrompt = challengeSettings.value;

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

    // Handle scenario generation for Q&A mode (doesn't require conversationId)
    if (generateScenario) {
      // Fetch persona's qa_scenario_prompt and scene template
      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .select('qa_scenario_prompt, qa_scene_template')
        .eq('id', personaId)
        .single();

      if (personaError) {
        console.error('Failed to fetch persona for scenario:', personaError);
      }

      let scenarioPrompt = persona?.qa_scenario_prompt ||
        'Generate a short scenario sentence to set the scene for a practice conversation.';

      // Apply trait token replacement on qa_scenario_prompt (same pattern as ai-config-resolver)
      // First load persona trait defaults for any categories not overridden by user
      const mergedTokens: Record<string, string> = {};
      const { data: personaDefaults } = await supabase
        .from('persona_trait_defaults')
        .select('trait_options(prompt_modifier, trait_categories(slug))')
        .eq('persona_id', personaId);

      if (personaDefaults) {
        for (const row of personaDefaults as any[]) {
          const catSlug = row.trait_options?.trait_categories?.slug;
          if (catSlug) {
            mergedTokens[catSlug] = row.trait_options.prompt_modifier || '';
          }
        }
      }

      // User selections override persona defaults
      if (promptTokens) {
        for (const [key, value] of Object.entries(promptTokens)) {
          mergedTokens[key] = value;
        }
      }

      // Replace tokens in scenario prompt
      for (const [key, value] of Object.entries(mergedTokens)) {
        scenarioPrompt = scenarioPrompt.replaceAll(`{{${key}}}`, value || '');
      }
      // Clean up unreplaced tokens
      scenarioPrompt = scenarioPrompt.replace(/\{\{[a-z_]+\}\}/g, '').replace(/\n{3,}/g, '\n\n').trim();

      // Append pseudo-tokens (keys starting with _) as additional context
      const pseudoInstructions = Object.entries(mergedTokens)
        .filter(([key, value]) => key.startsWith('_') && value)
        .map(([, value]) => value);
      if (pseudoInstructions.length > 0) {
        scenarioPrompt += '\nADDITIONAL CONTEXT:\n' + pseudoInstructions.join('\n');
      }

      const scenarioConfig = await resolveAIConfig(supabase, {
        task: 'scenario',
        personaId,
      });

      // Build system prompt from scene template (persona -> global -> minimal fallback)
      const sceneTemplate = persona?.qa_scene_template
        || scenarioConfig.scene_template
        || 'You are a creative scenario writer.\n\n{{scenario_prompt}}\n\nRULES:\n- Output ONLY the scenario text, no quotes or formatting\n- Second person present tense ("You...")\n- Be vivid, specific and immersive\n- Vary locations and details each time';

      const systemPrompt = sceneTemplate.replace('{{scenario_prompt}}', scenarioPrompt);

      const scenarioResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: scenarioConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate a new scenario.' },
          ],
          temperature: scenarioConfig.temperature,
          max_tokens: scenarioConfig.max_completion_tokens,
        }),
      });

      if (!scenarioResponse.ok) {
        throw new Error(`Groq API error: ${scenarioResponse.status}`);
      }

      const scenarioData = await scenarioResponse.json();
      const scenario = scenarioData.choices[0]?.message?.content || '';

      return new Response(
        JSON.stringify({ scenario }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle report generation
    if (generateReport) {
      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: 'Missing conversationId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      const reportConfig = await resolveAIConfig(supabase, {
        task: 'report',
        personaId: conversation.persona_id,
      });

      console.log('Report config resolved:', {
        model: reportConfig.model,
        temperature: reportConfig.temperature,
        max_tokens: reportConfig.max_completion_tokens,
      });

      const { data: reportMessages, error: msgError } = await supabase
        .from('messages')
        .select('role, content, sequence, created_at, response_time_ms, metadata')
        .eq('conversation_id', conversationId)
        .order('sequence', { ascending: true });

      if (msgError || !reportMessages || reportMessages.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No messages found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const timingMetrics = calculateTimingMetrics(
        reportMessages as MessageWithTiming[],
        conversation.started_at || conversation.created_at
      );

      const transcript = reportMessages
        .map(m => {
          const emotionalStage = (m as MessageWithTiming).metadata?.emotional_stage as { number: number; name: string } | undefined;
          if (m.role === 'assistant' && emotionalStage) {
            return `ASSISTANT [Emotional State: Stage ${emotionalStage.number} - ${emotionalStage.name}]: ${m.content}`;
          }
          return `${m.role.toUpperCase()}: ${m.content}`;
        })
        .join('\n\n');

      const personaInfo = conversation.personas;
      const reportUserPrompt = `Analyze this conversation between a user and ${personaInfo?.name || 'an AI coach'} (style: ${personaInfo?.challenge_style || 'dialectical'}).

CONVERSATION:
${transcript}

Generate a comprehensive session report.`;

      if (!reportConfig.report_system_prompt) {
        return new Response(
          JSON.stringify({ error: 'Report prompt not configured in database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const reportGroqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: reportConfig.model,
          messages: [
            { role: 'system', content: reportConfig.report_system_prompt },
            { role: 'user', content: reportUserPrompt },
          ],
          temperature: reportConfig.temperature,
          max_tokens: reportConfig.max_completion_tokens,
        }),
      });

      if (!reportGroqResponse.ok) {
        const errorText = await reportGroqResponse.text();
        console.error('Groq error:', reportGroqResponse.status, errorText);
        throw new Error(`Groq API error: ${reportGroqResponse.status}`);
      }

      const reportGroqData = await reportGroqResponse.json();
      const reportContent = reportGroqData.choices[0]?.message?.content || '';

      let report: SessionReport;
      try {
        const jsonMatch = reportContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : reportContent;
        report = JSON.parse(jsonStr.trim());
        report.generated_at = new Date().toISOString();
      } catch {
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

      if (!report.dimension_scores) {
        report.dimension_scores = {
          logical_reasoning: report.overall_score,
          bias_awareness: report.overall_score,
          perspective_taking: report.overall_score,
          emotional_regulation: report.overall_score,
        };
      }

      for (const key of Object.keys(report.dimension_scores) as (keyof DimensionScores)[]) {
        report.dimension_scores[key] = Math.max(0, Math.min(100, report.dimension_scores[key] || 50));
      }

      report.overall_score = Math.max(0, Math.min(100, report.overall_score || 50));

      // Compute emotional progression from message metadata
      let emotionalProgression = null;
      const emotionalStages: { number: number; name: string }[] = [];
      for (const m of (reportMessages as MessageWithTiming[])) {
        if (m.role === 'assistant' && m.metadata?.emotional_stage) {
          const stage = m.metadata.emotional_stage as { number: number; name: string };
          emotionalStages.push(stage);
        }
      }
      if (emotionalStages.length > 0) {
        const startStage = emotionalStages[0];
        const endStage = emotionalStages[emotionalStages.length - 1];
        const delta = endStage.number - startStage.number;
        const stageCounts: Record<number, number> = {};
        for (const s of emotionalStages) {
          stageCounts[s.number] = (stageCounts[s.number] || 0) + 1;
        }
        emotionalProgression = {
          start: startStage,
          end: endStage,
          delta,
          trend: delta > 0 ? 'warmed_up' : delta < 0 ? 'cooled_down' : 'stayed_flat',
          stage_counts: stageCounts,
          journey: emotionalStages.map(s => s.number),
        };
      }

      const analysisSummary = emotionalProgression
        ? { ...report, emotional_progression: emotionalProgression }
        : report;

      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          analysis_summary: analysisSummary,
          overall_score: report.overall_score,
          timing_metrics: timingMetrics,
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Failed to save report:', updateError);
      }

      if (reportGroqData.usage) {
        await recordAIUsage(supabase, {
          userId: conversation.user_id,
          conversationId: conversationId,
          personaId: conversation.persona_id,
          model: reportConfig.model,
          promptTokens: reportGroqData.usage.prompt_tokens,
          completionTokens: reportGroqData.usage.completion_tokens,
          totalTokens: reportGroqData.usage.total_tokens,
          taskType: 'report',
        });
      }

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
        console.error('Gamification processing error:', gamificationError);
      }

      return new Response(
        JSON.stringify({ report, conversationId, gamification: gamificationResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conversationId || !personaId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId or personaId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!generateGreeting && !previewGreeting && !regenerateQuestion && !switchPhase && !requestQuickFeedback && !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation to get stored interaction_mode
    let conversationInteractionMode: string | null = null;
    if (conversationId) {
      const { data: convData } = await supabase
        .from('conversations')
        .select('interaction_mode')
        .eq('id', conversationId)
        .single();
      conversationInteractionMode = convData?.interaction_mode || null;
    }

    // Resolve effective interaction mode (request > conversation > scenario > persona default)
    const effectiveInteractionMode = interactionMode || conversationInteractionMode;

    // Fetch scenario context if this is a coaching session
    let coachingContext: CoachingContext | undefined;
    let scenarioData: { scenario_context: string; user_goal: string | null } | null = null;

    if (scenarioId) {
      const { data: scenario } = await supabase
        .from('scenarios')
        .select('scenario_context, user_goal, interaction_mode')
        .eq('id', scenarioId)
        .single();

      if (scenario) {
        scenarioData = scenario;
        coachingContext = {
          scenarioContext: scenario.scenario_context,
          userGoal: scenario.user_goal || undefined,
          interactionMode: effectiveInteractionMode || scenario.interaction_mode,
          currentPhase: currentPhase || 'roleplay',
          scenarioVariant,
        };
      }
    }

    // If we have question_mode set on conversation but no scenario, create a coaching context for it
    if (!coachingContext && effectiveInteractionMode === 'question_mode') {
      // Fetch scenario from first system message (saved by client in Q&A mode)
      let scenarioText = '';
      if (conversationId) {
        const { data: sceneMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conversationId)
          .eq('role', 'system')
          .order('sequence', { ascending: true })
          .limit(1)
          .single();
        if (sceneMsg?.content) {
          scenarioText = sceneMsg.content.replace(/^\[SCENE CONTEXT\]\n?/, '');
        }
      }
      coachingContext = {
        interactionMode: 'question_mode',
        currentPhase: 'roleplay',
        scenarioContext: scenarioText,
      };
    }

    // Determine if this is a coaching task
    const isCoachingTask = !!scenarioId || !!coachingContext;
    const taskType = isCoachingTask
      ? (currentPhase === 'feedback' ? 'coaching_feedback' : 'coaching')
      : 'chat';

    // Resolve AI config from database (global + persona settings)
    const config = await resolveAIConfig(supabase, {
      task: taskType,
      personaId,
      coaching: coachingContext,
      promptTokens,
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

      // For user_leads coaching mode, return scene context instead of AI greeting
      if (interactionMode === 'user_leads' && scenarioData) {
        const sceneContext = generateSceneContext(
          scenarioData.scenario_context,
          scenarioVariant
        );

        // Save the scene context as a system message (not assistant)
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'system',
          content: sceneContext,
          sequence: 1,
        });

        return new Response(
          JSON.stringify({
            response: sceneContext,
            sceneContext: true,
            interactionMode: 'user_leads',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Standard greeting generation for coach_leads or challengers
      const questionResponse = await generateQuestion();
      const questionContent = questionResponse.choices[0]?.message?.content || '';

      const greetingTaskType = isCoachingTask ? 'coaching' : 'greeting';
      let greetingMetadata: Record<string, unknown> | undefined;
      if (questionResponse.usage) {
        const greetingCost = await calculateAICost(supabase, config.model, questionResponse.usage.prompt_tokens, questionResponse.usage.completion_tokens);
        greetingMetadata = { ai_usage: buildAIUsageMetadata(questionResponse.usage, config.model, greetingTaskType, greetingCost) };
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: questionContent,
        sequence: 1,
        ...(greetingMetadata ? { metadata: greetingMetadata } : {}),
      });

      if (questionResponse.usage) {
        await recordAIUsage(supabase, {
          userId: conv?.user_id || null,
          conversationId: conversationId,
          personaId: personaId,
          model: config.model,
          promptTokens: questionResponse.usage.prompt_tokens,
          completionTokens: questionResponse.usage.completion_tokens,
          totalTokens: questionResponse.usage.total_tokens,
          taskType: greetingTaskType,
        });
      }

      return new Response(
        JSON.stringify({ response: questionContent, question: questionContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle phase switching (roleplay <-> feedback)
    if (switchPhase) {
      // Update conversation phase in database
      await supabase
        .from('conversations')
        .update({ current_phase: switchPhase })
        .eq('id', conversationId);

      // If switching to feedback, generate coaching feedback message
      if (switchPhase === 'feedback') {
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('sequence', { ascending: true });

        const history: GroqMessage[] = (messages || []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // Resolve config for feedback phase
        const feedbackConfig = await resolveAIConfig(supabase, {
          task: 'coaching_feedback',
          personaId,
          coaching: { ...coachingContext, currentPhase: 'feedback' },
          promptTokens,
        });

        const feedbackResponse = await callGroq([
          { role: 'system', content: feedbackConfig.full_system_prompt },
          ...history,
          { role: 'user', content: 'Please give me feedback on how I did in that practice session.' },
        ]);

        const feedbackMessage = feedbackResponse.choices[0]?.message?.content || '';
        const nextSequence = (messages?.length || 0) + 1;

        let switchFeedbackMetadata: Record<string, unknown> | undefined;
        if (feedbackResponse.usage) {
          const switchFeedbackCost = await calculateAICost(supabase, feedbackConfig.model, feedbackResponse.usage.prompt_tokens, feedbackResponse.usage.completion_tokens);
          switchFeedbackMetadata = { ai_usage: buildAIUsageMetadata(feedbackResponse.usage, feedbackConfig.model, 'feedback', switchFeedbackCost) };
        }

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: feedbackMessage,
          sequence: nextSequence,
          ...(switchFeedbackMetadata ? { metadata: switchFeedbackMetadata } : {}),
        });

        // Track feedback AI usage
        if (feedbackResponse.usage) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('user_id')
            .eq('id', conversationId)
            .single();

          await recordAIUsage(supabase, {
            userId: conv?.user_id || null,
            conversationId: conversationId,
            personaId: personaId,
            model: feedbackConfig.model,
            promptTokens: feedbackResponse.usage.prompt_tokens,
            completionTokens: feedbackResponse.usage.completion_tokens,
            totalTokens: feedbackResponse.usage.total_tokens,
            taskType: 'feedback',
          });
        }

        return new Response(
          JSON.stringify({ response: feedbackMessage, phase: 'feedback' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Switching back to roleplay - just acknowledge
      return new Response(
        JSON.stringify({ phase: 'roleplay', message: 'Switched back to practice mode.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle quick feedback request (mid-session feedback without ending roleplay)
    if (requestQuickFeedback) {
      const { data: persona } = await supabase
        .from('personas')
        .select('feedback_style')
        .eq('id', personaId)
        .single();

      const feedbackStyle = (persona?.feedback_style || 'sandwich') as 'sandwich' | 'direct' | 'question_based' | 'observational';

      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('sequence', { ascending: true });

      const history: GroqMessage[] = (messages || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const quickFeedbackPrompt = getQuickFeedbackPrompt(feedbackStyle, config.coaching_prompts);
      const nextSequence = (messages?.length || 0) + 1;

      const feedbackResponse = await callGroq([
        { role: 'system', content: config.full_system_prompt + '\n\n' + quickFeedbackPrompt },
        ...history,
        { role: 'user', content: 'Quick check - how am I doing?' },
      ]);

      const feedbackMessage = feedbackResponse.choices[0]?.message?.content || '';

      let quickFeedbackMetadata: Record<string, unknown> | undefined;
      if (feedbackResponse.usage) {
        const quickFeedbackCost = await calculateAICost(supabase, config.model, feedbackResponse.usage.prompt_tokens, feedbackResponse.usage.completion_tokens);
        quickFeedbackMetadata = { ai_usage: buildAIUsageMetadata(feedbackResponse.usage, config.model, 'feedback', quickFeedbackCost) };
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: feedbackMessage,
        sequence: nextSequence,
        ...(quickFeedbackMetadata ? { metadata: quickFeedbackMetadata } : {}),
      });

      // Track quick feedback AI usage
      if (feedbackResponse.usage) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .single();

        await recordAIUsage(supabase, {
          userId: conv?.user_id || null,
          conversationId: conversationId,
          personaId: personaId,
          model: config.model,
          promptTokens: feedbackResponse.usage.prompt_tokens,
          completionTokens: feedbackResponse.usage.completion_tokens,
          totalTokens: feedbackResponse.usage.total_tokens,
          taskType: 'feedback',
        });
      }

      return new Response(
        JSON.stringify({ response: feedbackMessage, quickFeedback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular message handling
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    const history: GroqMessage[] = (messages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const nextSequence = (messages?.length || 0) + 1;

    // Calculate response time since last message
    const lastMessage = messages?.[messages.length - 1];
    const userResponseTimeMs = lastMessage?.created_at
      ? Date.now() - new Date(lastMessage.created_at).getTime()
      : null;

    // Save user message with response time
    const userMessageCreatedAt = new Date().toISOString();
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      sequence: nextSequence,
      response_time_ms: userResponseTimeMs,
      created_at: userMessageCreatedAt,
    });

    // Generate response
    const groqResponse = await callGroq([
      { role: 'system', content: config.full_system_prompt },
      ...history,
      { role: 'user', content: userMessage! },
    ]);

    let assistantMessage = groqResponse.choices[0]?.message?.content || '';

    // Parse and strip emotional state tag from AI response (e.g., [STATE:2:CAUTIOUSLY_CURIOUS])
    let messageMetadata: Record<string, unknown> | null = null;
    const stateTagMatch = assistantMessage.match(/\[STATE:(\d+):([A-Z_]+)\]\s*$/);
    if (stateTagMatch) {
      assistantMessage = assistantMessage.replace(/\[STATE:\d+:[A-Z_]+\]\s*$/, '').trimEnd();
      messageMetadata = {
        emotional_stage: {
          number: parseInt(stateTagMatch[1], 10),
          name: stateTagMatch[2],
        },
      };
    }

    // Add AI usage metadata to the message
    const chatTaskType = isCoachingTask ? 'coaching' : 'chat';
    if (groqResponse.usage) {
      const chatCost = await calculateAICost(supabase, config.model, groqResponse.usage.prompt_tokens, groqResponse.usage.completion_tokens);
      messageMetadata = {
        ...messageMetadata,
        ai_usage: buildAIUsageMetadata(groqResponse.usage, config.model, chatTaskType, chatCost),
      };
    }

    // Calculate assistant response time (time since user message was saved)
    const assistantResponseTimeMs = Date.now() - new Date(userMessageCreatedAt).getTime();

    // Save assistant message with response time and optional metadata
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
      sequence: nextSequence + 1,
      response_time_ms: assistantResponseTimeMs,
      ...(messageMetadata ? { metadata: messageMetadata } : {}),
    });

    // Log usage
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (groqResponse.usage) {
      await recordAIUsage(supabase, {
        userId: conversation?.user_id || null,
        conversationId: conversationId,
        personaId: personaId,
        model: config.model,
        promptTokens: groqResponse.usage.prompt_tokens,
        completionTokens: groqResponse.usage.completion_tokens,
        totalTokens: groqResponse.usage.total_tokens,
        taskType: chatTaskType,
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
