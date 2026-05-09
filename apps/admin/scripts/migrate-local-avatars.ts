/**
 * One-shot migration: move the 81 bundled mobile-app avatar JPGs into the
 * Supabase persona-avatars bucket and rewrite personas.avatar_url for every
 * row that currently uses the 'local' sentinel.
 *
 * Idempotent — re-running uploads with upsert and only updates rows where
 * avatar_url is still 'local'.
 *
 * Run with:
 *   npx tsx scripts/migrate-local-avatars.ts
 */
import { createClient } from "@supabase/supabase-js"
import fs from "node:fs/promises"
import path from "node:path"

// --- env -------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Source .env.local first:",
    "\n  set -a && source .env.local && set +a"
  )
  process.exit(1)
}
const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = "persona-avatars"
const ASSETS_ROOT = path.resolve(
  __dirname,
  "../../dialectica/assets"
)

// --- name -> uploaded-filename map ----------------------------------------
// Mirrors lib/personaImages.ts in the mobile app. Keys are lowercased
// persona names; values are paths relative to ASSETS_ROOT.
const LOCAL_AVATARS: Record<string, string> = {
  "sarah mitchell": "women/sarah-mitchell.jpg",
  "marcus webb challenger": "men/marcus-webb.jpg",
  "cormac brennan": "men/cormac-brennan.jpg",
  "dr. raj patel": "men/raj-patel.jpg",
  "raj patel": "men/raj-patel.jpg",
  "henry tanaka": "men/henry-tanaka.jpg",
  "professor elena volkov": "women/elena-volkov.jpg",
  "elena volkov": "women/elena-volkov.jpg",
  "dr. maya chen": "women/maya-chen.jpg",
  "maya chen": "women/maya-chen.jpg",
  "yuki tanaka": "women/yuki-tanaka.jpg",
  "alexandra reed": "women/alexandra-reed.jpg",
  "sienna donovan": "women/sienna-donovan.jpg",
  "zara khoury": "women/zara-khoury.jpg",
  "bridget murphy": "women/bridget-murphy.jpg",
  "tessa grant": "women/tessa-grant.jpg",
  "fiona gallagher": "women/fiona-gallagher.jpg",
  "elena petrova": "women/elena-petrova.jpg",
  "lucas brandt": "men/lucas-brandt.jpg",
  "alex rivera": "men/alex-rivera.jpg",
  "jordan chen": "men/jordan-chen.jpg",
  "sam taylor": "men/sam-taylor.jpg",
  "dr. maya jensen": "women/maya-jensen.jpg",
  "maya jensen": "women/maya-jensen.jpg",
  "marcus webb": "men/marcus-webb-dating.jpg",
  "mia chang": "women/mia-chang.jpg",
  "chris martinez": "men/chris-martinez.jpg",
  "dr. sarah bennett": "women/sarah-bennett.jpg",
  "sarah bennett": "women/sarah-bennett.jpg",
  "rachel stevens": "women/rachel-stevens.jpg",
  "diana novak": "women/diana-novak.jpg",
  "hannah brooks": "women/hannah-brooks.jpg",
  "adaeze obi": "women/adaeze-obi.jpg",
  "jake sullivan": "men/jake-sullivan.jpg",
  "daniel hart": "men/daniel-hart.jpg",
  "michael santos": "men/michael-santos.jpg",
  "erin calloway": "women/erin-calloway.jpg",
  "david park": "men/david-park.jpg",
  "grace williams": "women/grace-williams.jpg",
  "natasha volkov": "women/natasha-volkov.jpg",
  "carmen delgado": "women/carmen-delgado.jpg",
  "jessica taylor": "women/jessica-taylor.jpg",
  "darnell washington": "men/darnell-washington.jpg",
  "jason wu": "men/jason-wu.jpg",
  "james morrison": "men/james-morrison.jpg",
  "aisha rahman": "women/aisha-rahman.jpg",
  "lisa moretti": "women/lisa-moretti.jpg",
  "claire dubois": "women/claire-dubois.jpg",
  "margaret brennan": "women/margaret-brennan.jpg",
  "nils eriksson": "men/nils-eriksson.jpg",
  "victor reyes": "men/victor-reyes.jpg",
  "catherine walsh": "women/catherine-walsh.jpg",
  "omar hassan": "men/omar-hassan.jpg",
  "elsa bergstrom": "women/elsa-bergstrom.jpg",
  "astrid nielsen": "women/astrid-nielsen.jpg",
  "kenji watanabe": "men/kenji-watanabe.jpg",
  "patrick doyle": "men/patrick-doyle.jpg",
  "dr. nina larsson": "women/nina-larsson.jpg",
  "nina larsson": "women/nina-larsson.jpg",
  "marcus johnson": "men/marcus-johnson.jpg",
  "emma larsson": "women/emma-larsson.jpg",
  "ingrid svensson": "women/ingrid-svensson.jpg",
  "kelly anderson": "women/kelly-anderson.jpg",
  "ryan callahan": "men/ryan-callahan.jpg",
  "jiro tanaka": "men/jiro-tanaka.jpg",
  "derek thompson": "men/derek-thompson.jpg",
  "karin lindberg": "women/karin-lindberg.jpg",
  "sophia adeyemi": "women/sophia-adeyemi.jpg",
  "eva lindqvist": "women/eva-lindqvist.jpg",
  "amara diallo": "women/amara-diallo.jpg",
  "erik lindgren": "men/erik-lindgren.jpg",
  "arjun mehta": "men/arjun-mehta.jpg",
  "nadia karim": "women/nadia-karim.jpg",
  "andrea flynn": "women/andrea-flynn.jpg",
  "natalie winter": "women/natalie-winter.jpg",
  "connor blake": "men/connor-blake.jpg",
  "charles okafor": "men/charles-okafor.jpg",
  "brett lawson": "men/brett-lawson.jpg",
  "victoria blackwell": "women/victoria-blackwell.jpg",
  "karen whitfield": "women/karen-whitfield.jpg",
  "helen crawford": "women/helen-crawford.jpg",
  "anders bergman": "men/anders-bergman.jpg",
  "hiroshi nakamura": "men/hiroshi-nakamura.jpg",
  "patricia keane": "women/patricia-keane.jpg",
  "julia kovacs": "women/julia-kovacs.jpg",
  "logan pierce": "men/logan-pierce.jpg",
  "grant lawson": "men/grant-lawson.jpg",
}

// Persona name (lowercased+trimmed) -> public storage URL after upload.
const nameToPublicUrl = new Map<string, string>()

async function uploadAll() {
  // Deduplicate paths so we only upload each unique file once.
  const uniquePaths = Array.from(new Set(Object.values(LOCAL_AVATARS)))
  console.log(
    `Uploading ${uniquePaths.length} unique files (referenced by ${Object.keys(LOCAL_AVATARS).length} persona names)…`
  )

  let uploaded = 0
  const skipped = 0
  let failed = 0
  const pathToPublicUrl = new Map<string, string>()

  for (const rel of uniquePaths) {
    const localPath = path.join(ASSETS_ROOT, rel)
    const remotePath = `legacy/${rel}`

    let body: Buffer
    try {
      body = await fs.readFile(localPath)
    } catch {
      console.warn(`  ! missing local file: ${rel} — skipping`)
      failed++
      continue
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, body, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "31536000, immutable",
      })

    if (error) {
      console.error(`  ✗ upload ${rel}: ${error.message}`)
      failed++
      continue
    }
    uploaded++

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath)
    pathToPublicUrl.set(rel, data.publicUrl)
  }

  // Resolve each persona name to its public URL.
  for (const [name, rel] of Object.entries(LOCAL_AVATARS)) {
    const publicUrl = pathToPublicUrl.get(rel)
    if (publicUrl) nameToPublicUrl.set(name, publicUrl)
  }

  console.log(
    `Uploads: ${uploaded} ok, ${skipped} skipped, ${failed} failed.\n`
  )
}

async function rewriteDb() {
  console.log("Rewriting personas.avatar_url for 'local' rows…")
  const { data: locals, error } = await supabase
    .from("personas")
    .select("id, name, avatar_url")
    .eq("avatar_url", "local")
  if (error) throw error
  if (!locals || locals.length === 0) {
    console.log("  (no rows to update — already migrated)\n")
    return
  }

  let updated = 0
  const unmatched: string[] = []

  for (const row of locals) {
    const key = (row.name ?? "").toLowerCase().trim()
    const url = nameToPublicUrl.get(key)
    if (!url) {
      unmatched.push(row.name)
      continue
    }
    const { error: upErr } = await supabase
      .from("personas")
      .update({ avatar_url: url })
      .eq("id", row.id)
    if (upErr) {
      console.error(`  ✗ ${row.name}: ${upErr.message}`)
      continue
    }
    updated++
  }

  console.log(`Updated ${updated}/${locals.length} persona rows.`)
  if (unmatched.length) {
    console.warn(
      `  ${unmatched.length} unmatched (no entry in LOCAL_AVATARS map):`
    )
    for (const n of unmatched) console.warn(`    - ${n}`)
  }
}

async function main() {
  await uploadAll()
  await rewriteDb()
  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
