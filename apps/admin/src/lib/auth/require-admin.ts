import "server-only"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AdminContext = {
  userId: string
  email: string
  role: "admin" | "superadmin"
  aal: "aal1" | "aal2"
}

class AdminGateError extends Error {
  constructor(
    public status: 401 | 403,
    public code: "unauthenticated" | "not_admin" | "mfa_required",
    message: string
  ) {
    super(message)
  }
}

/**
 * Server-side admin gate.
 *
 * Verifies (in order):
 *   1. There is an authenticated user (cookie session is valid).
 *   2. user_profiles.role is admin or superadmin (queried fresh — JWT claims
 *      can be stale after a role change).
 *   3. The session is at AAL2 (user has completed MFA challenge).
 *
 * Use `requireAdminPage()` from server components / pages — it redirects.
 * Use `requireAdminApi()` from route handlers — it returns Response on failure.
 */
async function loadAdminContext(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    throw new AdminGateError(401, "unauthenticated", "no session")
  }

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileErr || !profile) {
    throw new AdminGateError(403, "not_admin", "no profile")
  }
  if (profile.role !== "admin" && profile.role !== "superadmin") {
    throw new AdminGateError(403, "not_admin", "role insufficient")
  }

  // Authenticator Assurance Level — aal2 means MFA was used in this session.
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal = (aalData?.currentLevel ?? "aal1") as "aal1" | "aal2"

  // Once an admin has any TOTP factor enrolled, require AAL2 every session.
  // First-time admins (no factors yet) are allowed through so they can enrol.
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasFactor = (factors?.totp?.length ?? 0) > 0
  if (hasFactor && aal !== "aal2") {
    throw new AdminGateError(403, "mfa_required", "AAL2 required")
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role,
    aal,
  }
}

export async function requireAdminPage(): Promise<AdminContext> {
  try {
    return await loadAdminContext()
  } catch (e) {
    if (e instanceof AdminGateError) {
      if (e.code === "unauthenticated") redirect("/login")
      if (e.code === "mfa_required") redirect("/mfa")
      redirect("/forbidden")
    }
    throw e
  }
}

export async function requireAdminApi(): Promise<
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: Response }
> {
  try {
    const ctx = await loadAdminContext()
    return { ok: true, ctx }
  } catch (e) {
    if (e instanceof AdminGateError) {
      return {
        ok: false,
        response: Response.json(
          { error: e.code, message: e.message },
          { status: e.status }
        ),
      }
    }
    throw e
  }
}
