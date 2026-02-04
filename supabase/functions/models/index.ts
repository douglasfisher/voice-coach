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

      // Filter to chat models only (exclude whisper, etc.)
      const chatModels = groqData.data.filter(m =>
        m.active &&
        !m.id.includes('whisper') &&
        !m.id.includes('guard') &&
        !m.id.includes('tool-use') &&
        m.context_window > 0
      );

      // Upsert models into database
      const modelsToUpsert = chatModels.map(m => ({
        id: m.id,
        name: formatModelName(m.id),
        provider: 'groq',
        context_window: m.context_window,
        active: m.active,
        owned_by: m.owned_by,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('ai_models')
        .upsert(modelsToUpsert, { onConflict: 'id' });

      if (upsertError) {
        console.error('Failed to upsert models:', upsertError);
        return errorResponse('Failed to save models', 500);
      }

      // Mark models not in the response as inactive
      const activeIds = chatModels.map(m => m.id);
      await supabase
        .from('ai_models')
        .update({ active: false })
        .not('id', 'in', `(${activeIds.map(id => `'${id}'`).join(',')})`);

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
