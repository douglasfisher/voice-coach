import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { serverEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Server-only Supabase client backed by the SECRET key.
 *
 * Bypasses RLS. Only use this from inside route handlers AFTER requireAdmin()
 * has verified the caller. Never import this from a client component.
 *
 * Cached across requests — the client is stateless and safe to reuse.
 */
let cached: SupabaseClient<Database> | null = null

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (cached) return cached
  const env = serverEnv()
  cached = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "dialectica-admin" },
    },
  })
  return cached
}
