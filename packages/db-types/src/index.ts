/**
 * Re-export the generated Supabase types so both apps can `import { Database }
 * from '@dialectica/db-types'` and get the same definitions.
 *
 * To refresh: `pnpm --filter @dialectica/db-types gen` (or `pnpm gen:types`
 * at the root). Both apps see the change immediately — no per-app regen.
 */
export * from "./database"
