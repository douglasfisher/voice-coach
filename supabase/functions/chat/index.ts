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
import { recordAIUsage } from '../_shared/cost-calculator.ts';

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
  // Coaching-specific fields
  scenarioId?: string;
  interactionMode?: 'coach_leads' | 'user_leads' | 'turn_taking';
  currentPhase?: 'roleplay' | 'feedback';
  scenarioVariant?: { name: string; context: string };
  requestQuickFeedback?: boolean;
  switchPhase?: 'roleplay' | 'feedback';
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
      generateChallenge,
      // Coaching fields
      scenarioId,
      interactionMode,
      currentPhase,
      scenarioVariant,
      requestQuickFeedback,
      switchPhase,
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

    if (!generateGreeting && !previewGreeting && !regenerateQuestion && !switchPhase && !requestQuickFeedback && !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          interactionMode: interactionMode || scenario.interaction_mode,
          currentPhase: currentPhase || 'roleplay',
          scenarioVariant,
        };
      }
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

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: questionContent,
        sequence: 1,
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
          taskType: isCoachingTask ? 'coaching' : 'greeting',
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
        });

        const feedbackResponse = await callGroq([
          { role: 'system', content: feedbackConfig.full_system_prompt },
          ...history,
          { role: 'user', content: 'Please give me feedback on how I did in that practice session.' },
        ]);

        const feedbackMessage = feedbackResponse.choices[0]?.message?.content || '';
        const nextSequence = (messages?.length || 0) + 1;

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: feedbackMessage,
          sequence: nextSequence,
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

      const quickFeedbackPrompt = getQuickFeedbackPrompt(feedbackStyle);
      const nextSequence = (messages?.length || 0) + 1;

      const feedbackResponse = await callGroq([
        { role: 'system', content: config.full_system_prompt + '\n\n' + quickFeedbackPrompt },
        ...history,
        { role: 'user', content: 'Quick check - how am I doing?' },
      ]);

      const feedbackMessage = feedbackResponse.choices[0]?.message?.content || '';

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: feedbackMessage,
        sequence: nextSequence,
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

    const assistantMessage = groqResponse.choices[0]?.message?.content || '';

    // Calculate assistant response time (time since user message was saved)
    const assistantResponseTimeMs = Date.now() - new Date(userMessageCreatedAt).getTime();

    // Save assistant message with response time
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
      sequence: nextSequence + 1,
      response_time_ms: assistantResponseTimeMs,
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
        taskType: isCoachingTask ? 'coaching' : 'chat',
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
