/**
 * Unified AI Service Edge Function
 *
 * A single endpoint for all AI tasks: chat, analysis, summarization, etc.
 * This provides a maintainable, component-based architecture.
 *
 * Endpoint: POST /functions/v1/ai
 *
 * Request body:
 * {
 *   "task": "chat" | "analyze" | "complete",
 *   "personaId": "optional-persona-id",
 *   "systemPrompt": "optional-override",
 *   "userPrompt": "required-user-input",
 *   "context": [{ role, content }],  // optional conversation history
 *   "settings": { temperature, max_completion_tokens, ... },
 *   "responseFormat": "text" | "json"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createGroqClient,
  createSupabaseClient,
  getPersonaConfig,
  getSystemPrompt,
  createPersonaConfig,
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_SETTINGS,
  buildAnalysisUserPrompt,
  DEFAULT_ANALYSIS,
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  parseJsonBody,
  requireFields,
  AITaskRequest,
  AITaskResponse,
  GroqMessage,
  ChallengeStyle,
  AnalysisResult,
} from '../_shared/index.ts';

// =============================================================================
// TASK HANDLERS
// =============================================================================

interface TaskContext {
  groq: ReturnType<typeof createGroqClient>;
  supabase: ReturnType<typeof createSupabaseClient>;
}

/**
 * Handle chat task with persona
 */
async function handleChatTask(
  request: AITaskRequest,
  ctx: TaskContext
): Promise<AITaskResponse> {
  let systemPrompt = request.systemPrompt;
  let settings = request.settings || {};

  // If personaId provided, try to get config
  if (request.personaId && !systemPrompt) {
    // First try local config
    let config = getPersonaConfig(request.personaId);

    // If not found locally, try database
    if (!config) {
      const { data: dbPersona } = await ctx.supabase
        .from('personas')
        .select('id, name, challenge_style, system_prompt')
        .eq('id', request.personaId)
        .single();

      if (dbPersona) {
        // Use database persona with custom or style-based prompt
        config = createPersonaConfig(
          dbPersona.id,
          dbPersona.name,
          dbPersona.challenge_style as ChallengeStyle,
          dbPersona.system_prompt || undefined
        );
      }
    }

    if (config) {
      systemPrompt = config.systemPrompt;
      settings = { ...config.settings, ...settings };
    }
  }

  // Fallback to a generic helpful assistant
  if (!systemPrompt) {
    systemPrompt = 'You are a helpful, thoughtful assistant engaged in intellectual conversation.';
  }

  // Build messages array
  const messages: GroqMessage[] = request.context || [];

  // Generate response
  const content = await ctx.groq.completeWithHistory(
    systemPrompt,
    messages,
    request.userPrompt,
    settings
  );

  return {
    success: true,
    content,
  };
}

/**
 * Handle analysis task
 */
async function handleAnalyzeTask(
  request: AITaskRequest,
  ctx: TaskContext
): Promise<AITaskResponse> {
  const systemPrompt = request.systemPrompt || ANALYSIS_SYSTEM_PROMPT;
  const userPrompt = buildAnalysisUserPrompt(
    request.userPrompt,
    request.context?.map(m => ({ role: m.role, content: m.content }))
  );

  const { content, parsed } = await ctx.groq.completeJSON<AnalysisResult>(
    systemPrompt,
    userPrompt,
    { ...ANALYSIS_SETTINGS, ...request.settings }
  );

  return {
    success: true,
    content,
    parsed: parsed || DEFAULT_ANALYSIS,
  };
}

/**
 * Handle generic completion task
 */
async function handleCompleteTask(
  request: AITaskRequest,
  ctx: TaskContext
): Promise<AITaskResponse> {
  const systemPrompt = request.systemPrompt || 'You are a helpful assistant.';

  if (request.responseFormat === 'json') {
    const { content, parsed } = await ctx.groq.completeJSON(
      systemPrompt,
      request.userPrompt,
      request.settings
    );
    return { success: true, content, parsed };
  }

  const content = await ctx.groq.complete(
    systemPrompt,
    request.userPrompt,
    request.settings
  );

  return { success: true, content };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Parse request
    const request = await parseJsonBody<AITaskRequest>(req);
    requireFields(request, ['task', 'userPrompt']);

    // Initialize clients
    const ctx: TaskContext = {
      groq: createGroqClient(),
      supabase: createSupabaseClient(),
    };

    // Route to appropriate handler
    let response: AITaskResponse;

    switch (request.task) {
      case 'chat':
        response = await handleChatTask(request, ctx);
        break;

      case 'analyze':
        response = await handleAnalyzeTask(request, ctx);
        break;

      case 'summarize':
      case 'transform':
      default:
        response = await handleCompleteTask(request, ctx);
        break;
    }

    return jsonResponse(response);

  } catch (error) {
    console.error('AI service error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error && error.message.includes('Missing') ? 400 : 500
    );
  }
});
