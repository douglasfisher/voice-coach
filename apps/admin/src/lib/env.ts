import { z } from "zod"

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_", {
      message: "Use the new sb_publishable_* key, not the legacy anon JWT.",
    }),
})

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_", {
    message: "Use the new sb_secret_* key, not the legacy service_role JWT.",
  }),
  ADMIN_ALLOWED_ORIGINS: z.string().min(1),
})

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})

// Lazily parsed — only reachable from server modules. Throws at first use if
// SUPABASE_SECRET_KEY is missing, which is the desired fail-fast behaviour.
let _serverEnv: z.infer<typeof serverSchema> | null = null
export function serverEnv() {
  if (_serverEnv) return _serverEnv
  _serverEnv = serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    ADMIN_ALLOWED_ORIGINS: process.env.ADMIN_ALLOWED_ORIGINS,
  })
  return _serverEnv
}
