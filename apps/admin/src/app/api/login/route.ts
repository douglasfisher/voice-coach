import { redirect } from "next/navigation"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().startsWith("/").optional(),
})

/**
 * POST /api/login
 *
 * Browser-native login form post (vs a React Server Action). Server
 * actions submit via fetch which leaves browser password managers
 * unsure whether the form succeeded — many of them silently skip
 * the "save password?" prompt for action-based forms.
 *
 * A regular POST + 303 redirect to the same login URL with an
 * `?error=...` query param on failure is the well-trodden pattern that
 * Chrome / Safari / 1Password / Bitwarden all reliably recognise.
 *
 * On success, redirect to ?next= (validated to start with "/") or to
 * /admin. The redirect itself is what tells the browser "yes, login
 * succeeded — offer to save".
 */
export async function POST(req: Request) {
  const form = await req.formData()
  const parsed = credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    next: form.get("next") || undefined,
  })

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Invalid credentials.")}`)
  }

  // Confirm the signed-in user is actually an admin before sending them on.
  // Non-admins get a generic "no access" error and are signed back out so
  // the session cookie isn't left lying around in their browser.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Sign-in failed.")}`)
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    await supabase.auth.signOut()
    redirect(
      `/login?error=${encodeURIComponent(
        "This account does not have admin access."
      )}`
    )
  }

  // next is already validated to start with "/" by zod.
  redirect(parsed.data.next ?? "/admin")
}
