"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().startsWith("/").optional(),
})

export async function signInAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  })
  if (!parsed.success) {
    return { error: "Invalid email or password." }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    return { error: "Invalid credentials." }
  }

  // Confirm the signed-in user is actually an admin before sending them on.
  // Non-admins get a generic "no access" error and are signed back out so the
  // session cookie isn't left lying around in their browser.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign-in failed." }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    await supabase.auth.signOut()
    return { error: "This account does not have admin access." }
  }

  redirect(parsed.data.next ?? "/admin")
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
