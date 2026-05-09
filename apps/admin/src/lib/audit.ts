import "server-only"

import { headers } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { AdminContext } from "@/lib/auth/require-admin"
import type { Database } from "@/types/database"

type Json = Database["public"]["Tables"]["admin_audit_log"]["Insert"]["diff"]

type AuditEntry = {
  action: string
  targetTable?: string
  targetId?: string | null
  diff?: { before?: unknown; after?: unknown } | null
}

/**
 * Append a row to admin_audit_log. Call from inside admin route handlers
 * AFTER a mutation succeeds. Uses the secret-key client because the audit
 * table has no INSERT policy (writes only via this server path).
 *
 * Never throws — audit failures are logged but do not break the user request.
 * Pair with proper monitoring on the table to catch any drop in volume.
 */
export async function audit(ctx: AdminContext, entry: AuditEntry) {
  try {
    const h = await headers()
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    const userAgent = h.get("user-agent") ?? null
    const requestId = h.get("x-request-id") ?? null

    const admin = createSupabaseAdminClient()
    await admin.from("admin_audit_log").insert({
      actor_id: ctx.userId,
      actor_email: ctx.email,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      diff: (entry.diff ?? null) as Json,
      ip,
      user_agent: userAgent,
      request_id: requestId,
    })
  } catch (err) {
    console.error("[audit] failed to record", entry.action, err)
  }
}
