/**
 * Runware Edge Function — Generic Proxy
 *
 * Thin proxy that forwards requests to the Runware API.
 * Client builds the full payload; this function just injects auth.
 * Same philosophy as the Groq proxy.
 */

import { corsHeaders, corsPreflightResponse, errorResponse } from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const apiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!apiKey) {
      return errorResponse('RUNWARE_API_KEY not configured', 500);
    }

    const body = await req.text();

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Runware proxy error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
