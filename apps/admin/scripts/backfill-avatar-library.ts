/**
 * One-shot backfill: scan persona-avatars/* in storage and insert
 * avatar_library rows for any file that doesn't already have one.
 *
 * Idempotent — re-running skips files that are already catalogued.
 *
 * Heuristics:
 *   - Files under /hires/ → is_hi_res = true
 *   - Files under /drafts/, /cropped/, /legacy/ → is_hi_res = false
 *   - Gender + ethnicity left null (we can't recover the params from
 *     the filename); admins can edit later via SQL if needed.
 *   - public_url is computed from the storage SDK helper.
 *
 * Run with:
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-avatar-library.ts
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Source .env.local first:\n" +
      "  set -a && source .env.local && set +a"
  )
  process.exit(1)
}
const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = "persona-avatars"
const PREFIXES = ["drafts", "hires", "cropped", "legacy"] as const

async function listAllUnder(prefix: string): Promise<string[]> {
  const out: string[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset })
    if (error) {
      console.error(`list ${prefix} (offset ${offset}) failed`, error)
      break
    }
    if (!data || data.length === 0) break
    for (const f of data) {
      if (f.name && !f.name.endsWith("/")) {
        out.push(`${prefix}/${f.name}`)
      }
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  return out
}

async function listAllRecursive(prefix: string): Promise<string[]> {
  // legacy has subdirs (men/, women/); the others are flat.
  const top = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 })
  if (top.error || !top.data) return []
  const out: string[] = []
  for (const entry of top.data) {
    // entry with no extension that isn't a hidden file → directory
    const looksLikeDir =
      !entry.name.includes(".") || entry.metadata == null
    if (looksLikeDir) {
      const sub = await listAllUnder(`${prefix}/${entry.name}`)
      out.push(...sub)
    } else {
      out.push(`${prefix}/${entry.name}`)
    }
  }
  return out
}

async function main() {
  console.log("Backfilling avatar_library from storage…")

  const allPaths: string[] = []
  for (const prefix of PREFIXES) {
    const paths =
      prefix === "legacy"
        ? await listAllRecursive(prefix)
        : await listAllUnder(prefix)
    console.log(`  ${prefix}: ${paths.length} files`)
    allPaths.push(...paths)
  }
  console.log(`Total in storage: ${allPaths.length}`)

  const { data: existing, error: existingErr } = await supabase
    .from("avatar_library")
    .select("storage_path")
  if (existingErr) {
    console.error("failed to read existing rows", existingErr)
    process.exit(1)
  }
  const known = new Set((existing ?? []).map((r) => r.storage_path))
  const toInsert = allPaths.filter((p) => !known.has(p))
  console.log(`Already catalogued: ${known.size}`)
  console.log(`To insert: ${toInsert.length}`)

  if (toInsert.length === 0) {
    console.log("Nothing to do.")
    return
  }

  // Insert in chunks of 200.
  const CHUNK = 200
  let done = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const rows = chunk.map((path) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return {
        storage_path: path,
        public_url: data.publicUrl,
        prompt: "[backfilled from storage]",
        params: null,
        gender: null,
        ethnicity: null,
        created_by: null,
        used_by_persona_id: null,
        generation_batch_id: null,
        is_hi_res: path.startsWith("hires/"),
      }
    })
    const { error } = await supabase.from("avatar_library").insert(rows)
    if (error) {
      console.error(`  ✗ chunk at ${i}: ${error.message}`)
    } else {
      done += rows.length
      console.log(`  ✓ ${done}/${toInsert.length}`)
    }
  }

  console.log(`Done — inserted ${done}/${toInsert.length} rows.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
