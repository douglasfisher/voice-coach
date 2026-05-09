/**
 * Admin-side database types facade.
 *
 * The generated Supabase shape lives in `@dialectica/db-types` so a
 * single `pnpm gen:types` (or `pnpm --filter @dialectica/db-types gen`)
 * keeps mobile + admin in sync. Existing imports like
 * `import type { Database } from "@/types/database"` keep working — they
 * now transparently resolve to the shared package.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "@dialectica/db-types"
export { Constants } from "@dialectica/db-types"
