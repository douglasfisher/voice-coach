/**
 * Shared utilities for edge functions
 */

// =============================================================================
// CORS HEADERS
// =============================================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message, success: false }, status);
}

export function successResponse(data: unknown): Response {
  return jsonResponse({ ...data as object, success: true });
}

export function corsPreflightResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON in request body');
  }
}

// =============================================================================
// SUPABASE CLIENT HELPER
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function requireFields<T extends object>(
  obj: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`Missing required field: ${String(field)}`);
    }
  }
}
