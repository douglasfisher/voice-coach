/**
 * Models Edge Function
 *
 * Fetches available AI models from Groq API and stores them in the database.
 *
 * Endpoint: POST /functions/v1/models
 *
 * Actions:
 * - GET: List cached models from database
 * - POST: Refresh models from Groq API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createSupabaseClient,
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
} from '../_shared/index.ts';

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
}

interface GroqModelsResponse {
  object: string;
  data: GroqModel[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const supabase = createSupabaseClient();

    // GET: Return cached models from database
    if (req.method === 'GET') {
      const { data: models, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Failed to fetch models:', error);
        return errorResponse('Failed to fetch models', 500);
      }

      return jsonResponse({ models: models || [] });
    }

    // POST: Refresh models from Groq API
    if (req.method === 'POST') {
      const groqApiKey = Deno.env.get('GROQ_API_KEY');
      if (!groqApiKey) {
        return errorResponse('GROQ_API_KEY not configured', 500);
      }

      // Fetch models from Groq
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', errorText);
        return errorResponse(`Failed to fetch models from Groq: ${response.status}`, 500);
      }

      const groqData: GroqModelsResponse = await response.json();

      // Filter to chat models only (exclude whisper, speech, etc.)
      const chatModels = groqData.data.filter(m => {
        const id = m.id.toLowerCase();
        // Exclude non-chat models
        if (id.includes('whisper')) return false;
        if (id.includes('guard')) return false;
        if (id.includes('tool-use')) return false;
        if (id.includes('speech')) return false;
        if (id.includes('tts')) return false;
        // Include if it looks like a chat model
        return true;
      });

      console.log(`Found ${chatModels.length} chat models from Groq API`);

      if (chatModels.length === 0) {
        return errorResponse('No chat models found from Groq API', 500);
      }

      // Upsert models into database
      const modelsToUpsert = chatModels.map(m => ({
        id: m.id,
        name: formatModelName(m.id),
        provider: 'groq',
        context_window: m.context_window || null,
        active: true, // Mark as active since it's in the API response
        owned_by: m.owned_by || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('ai_models')
        .upsert(modelsToUpsert, { onConflict: 'id' });

      if (upsertError) {
        console.error('Failed to upsert models:', upsertError);
        return errorResponse('Failed to save models', 500);
      }

      // Mark models NOT in the response as inactive (using correct Supabase syntax)
      const activeIds = chatModels.map(m => m.id);
      const { error: deactivateError } = await supabase
        .from('ai_models')
        .update({ active: false, updated_at: new Date().toISOString() })
        .not('id', 'in', `(${activeIds.join(',')})`);

      if (deactivateError) {
        console.warn('Failed to deactivate old models:', deactivateError);
        // Don't fail the request, models were still updated
      }

      return jsonResponse({
        message: 'Models refreshed successfully',
        count: modelsToUpsert.length,
        models: modelsToUpsert,
      });
    }

    return errorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('Models error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

/**
 * Format model ID into a human-readable name
 */
function formatModelName(id: string): string {
  // llama-3.3-70b-versatile -> Llama 3.3 70B Versatile
  return id
    .split('-')
    .map(part => {
      // Keep version numbers as-is
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      // Keep size indicators uppercase
      if (/^\d+b$/i.test(part)) return part.toUpperCase();
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}
