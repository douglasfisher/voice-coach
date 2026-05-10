"use server"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Sign-OUT action. Sign-IN moved to the route handler at /api/login so
 * password managers reliably trigger their save prompts on submit.
 * Sign-out doesn't need that — it's a one-click action button, not a
 * credential form, so a server action is fine here.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
