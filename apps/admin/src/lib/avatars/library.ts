import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type AvatarLibraryInsert =
  Database["public"]["Tables"]["avatar_library"]["Insert"]

/**
 * Insert one row into avatar_library. Used by the avatar generation,
 * upscale, and crop routes so every image they produce is tracked
 * regardless of whether the user later saves a persona. Mobile uses a
 * batch save-on-persona-save pattern; the web admin is more permissive
 * and saves up-front so admins can browse history at any time.
 *
 * Failures are logged but never thrown — a library write going wrong
 * shouldn't block the avatar flow itself.
 */
export async function recordAvatarLibraryRow(
  admin: SupabaseClient<Database>,
  row: AvatarLibraryInsert
): Promise<void> {
  try {
    const { error } = await admin.from("avatar_library").insert(row)
    if (error) {
      console.error("avatar_library insert failed", { error, row })
    }
  } catch (err) {
    console.error("avatar_library insert threw", { err, row })
  }
}

/**
 * Insert N rows (one per draft) sharing a generation_batch_id.
 * Convenience wrapper that wraps recordAvatarLibraryRow's failure model.
 */
export async function recordAvatarLibraryRows(
  admin: SupabaseClient<Database>,
  rows: AvatarLibraryInsert[]
): Promise<void> {
  if (rows.length === 0) return
  try {
    const { error } = await admin.from("avatar_library").insert(rows)
    if (error) {
      console.error("avatar_library batch insert failed", {
        error,
        rowCount: rows.length,
      })
    }
  } catch (err) {
    console.error("avatar_library batch insert threw", {
      err,
      rowCount: rows.length,
    })
  }
}
