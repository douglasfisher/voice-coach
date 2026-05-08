import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { serverEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Server-side Supabase client tied to the user's cookie session.
 *
 * Uses the publishable key — RLS still applies. Use this for any read that
 * should be performed "as the signed-in admin", so RLS provides defence in
 * depth on top of our route-level requireAdmin gate.
 */
export async function createSupabaseServerClient() {
  const env = serverEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — ignore. Middleware
            // refreshes cookies on every request, so the session stays fresh.
          }
        },
      },
    }
  )
}
