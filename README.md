# Dialectica Admin

Web admin console for sysadmins. Sits alongside the React Native app and the
Supabase project — does not replace either.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind v4 + shadcn/ui (`base-nova` style, Base UI primitives)
- `@supabase/ssr` (cookie sessions) + `@supabase/supabase-js` (admin client)
- TanStack Table (data grids), react-hook-form + zod (forms)

## Architecture

```
src/
  middleware.ts                         session refresh + CSRF + redirect
  lib/
    env.ts                              zod-validated env (rejects legacy keys)
    supabase/
      browser.ts                        publishable key, client components
      server.ts                         publishable key + cookie session, RSC
      admin.ts                          SECRET key, server-only, bypasses RLS
    auth/require-admin.ts               role + AAL2 gate
    audit.ts                            append-only audit log writer
  app/
    login/                              email+password sign-in
    forbidden/                          non-admin landing
    mfa/                                MFA enrolment / challenge stub
    admin/                              gated by requireAdminPage in layout
      layout.tsx
      page.tsx                          KPI dashboard
    api/admin/                          (to come) REST routes for mutations
  components/
    admin/                              shell, sidebar, user menu
    ui/                                 shadcn primitives
```

## Security model

Defence in depth — five independent layers:

1. **Network.** Vercel firewall / IP allowlist for `/admin/*` and `/api/admin/*`.
2. **Edge middleware.** `middleware.ts` refreshes session, redirects
   unauthenticated traffic, and rejects cross-origin admin mutations (CSRF).
3. **Per-request gate.** `requireAdminPage()` / `requireAdminApi()` verify
   `user_profiles.role` ∈ {admin, superadmin} and that the session is at AAL2
   (MFA) when the user has any TOTP factor enrolled.
4. **RLS.** Every admin-touched table has a policy gated on the SQL function
   `is_admin(auth.uid())`. Reads in admin pages use the cookie-session client
   so RLS still applies; the secret-key client is used only for writes that
   genuinely need to bypass RLS.
5. **Audit log.** `admin_audit_log` is append-only — no INSERT/UPDATE/DELETE
   policies — and only writable via the server using the secret key. Every
   admin route handler must call `audit(ctx, …)` after a successful mutation.

The DB-side primitives live in migration `073_admin_security.sql` in the main
Dialectica repo.

## Setup

```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_*),
# SUPABASE_SECRET_KEY (sb_secret_*) and ADMIN_ALLOWED_ORIGINS.

# Run migration 073 in the main repo first:
#   cd ../dialectica && ./scripts/migrate.sh run 073

# Promote yourself to admin (one-time, via SQL):
#   UPDATE user_profiles SET role = 'admin' WHERE id = '<your-auth-user-id>';

npm install
npm run dev          # http://localhost:4837 (set in package.json scripts)
```

## Adding admin mutation endpoints

```ts
// src/app/api/admin/personas/[id]/route.ts
import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  const patch = await req.json()
  // ...zod-validate `patch` here...

  const admin = createSupabaseAdminClient()
  const { data: before } = await admin.from("personas").select("*").eq("id", id).single()
  const { data: after, error } = await admin.from("personas").update(patch).eq("id", id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await audit(gate.ctx, { action: "persona.update", targetTable: "personas", targetId: id, diff: { before, after } })
  return Response.json({ data: after })
}
```

## What's built

- **Users** list + detail + role mutation.
- **Personas** list (grid + table views) + create/edit with tabbed editor
  (Identity · Personality & Style · Prompts · Voice & AI · Avatar). All
  AI persona generation: per-section AI write, master "Generate persona"
  dialog with 5 pre-flight constraint selects, identity AI fill button.
- **Avatar generation:** 4-up FLUX drafts → crop modal with composition
  silhouette overlay → photoreal hi-res upscale (nano-banana). Saved
  avatar params persist on `personas.avatar_params`.
- **AI config:** `/admin/ai-config` index + editors for
  `ai_persona_generator`, `ai_avatar_composition`, `ai_voice_defaults`.
- **Audit log:** every admin mutation logs to `admin_audit_log`. Viewer
  at `/admin/audit-log` (superadmin only).

## Follow-ups

See [`docs/FOLLOW_UPS.md`](./docs/FOLLOW_UPS.md) for known deferred
items (avatar library browser, mobile composition overlay parity,
trait-token reconciliation, subscriptions page, etc.).

## Still bare-bones

- MFA challenge flow (`/mfa` is a stub — Supabase MFA enrolment must be
  done via the dashboard for now)
- Recharts-based usage / cost / budget charts (sidebar links exist;
  pages are 404)
- Rate limiting (Upstash or Vercel KV) on `/api/admin/*`
