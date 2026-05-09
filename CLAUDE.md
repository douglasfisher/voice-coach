# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dialectica is a **pnpm monorepo** with two apps:
- **`apps/mobile/`** — React Native + Expo 54 coaching app. Users practice interpersonal skills (dating, interviews, negotiations) through AI-powered roleplay with 24+ coaches/advisors/challengers.
- **`apps/admin/`** — Next.js 16 web admin (port 4837). Edits personas, AI config, users, conversations, audit log. Replaces the deleted in-mobile admin screens.

Plus two shared packages:
- **`packages/db-types/`** — generated Supabase types (single source of truth).
- **`packages/shared-types/`** — payload shapes the chat edge function emits (`AnalysisResult`, `SessionReport`, `TimingMetrics`, `PersonaAIConfig`).

`supabase/` (functions + migrations) and `scripts/` (db.sh, migrate.sh) live at the repo root since they're shared infrastructure.

## Commands

Run from the repo root unless noted.

```bash
# Install (pnpm workspaces)
pnpm install

# Development
pnpm dev:mobile          # Expo dev server (apps/mobile)
pnpm dev:admin           # Next.js on http://localhost:4837 (apps/admin)
# Or directly inside a workspace:
cd apps/mobile && pnpm dev:ios     # iOS simulator
cd apps/mobile && pnpm fresh       # Fresh iOS (reset simulator)

# Code quality (all workspaces in parallel)
pnpm typecheck
pnpm lint

# Build & deploy
pnpm build:mobile:ios    # EAS build for iOS (delegates to apps/mobile)
pnpm build:admin         # next build (apps/admin)

# Database (root scripts manage the shared Supabase project)
pnpm db:tables
pnpm db:query "SELECT count(*) FROM personas"
pnpm db:describe personas
pnpm migrate:status
pnpm migrate:run

# Generate DB types — single command updates both apps and the shared package
pnpm gen:types

# Edge functions (still run via the supabase CLI)
pnpm deploy:chat
pnpm deploy:tts
pnpm deploy:runware
# Or:
supabase functions deploy <function-name> --no-verify-jwt --project-ref enatcutnrtuauykqyajc
```

## Architecture

### Tech Stack
- **Framework**: Expo 54 / React Native 0.81 / React 19
- **Routing**: Expo Router v6 (file-based, `app/` directory)
- **State**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind 4 (Tailwind CSS for RN, `tailwind.config.js`)
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **AI**: Groq API (called from edge functions, NOT client)
- **Voice**: ElevenLabs TTS + Expo Speech Recognition STT
- **Icons**: lucide-react-native

### Route Groups
- `app/(auth)/` — Login, signup, onboarding
- `app/(tabs)/` — Main tabs: home, personas, coaches, growth, profile
- `app/(tabs)/chat/` — Chat conversation interface
- `app/admin/` — Admin dashboard (settings, personas, costs, users)

### State Stores (`stores/`)
- `authStore.ts` — User auth, profile, preferences
- `chatStore.ts` — Active conversation, messages, preview state, interaction mode
- `personaStore.ts` — Persona list with local avatar mapping (LOCAL_AVATARS)
- `coachingStore.ts` — Coaching session state
- `analysisStore.ts` — Message analysis & insights

### Database-Driven AI Config (Critical Pattern)
All AI prompts and config live in the database, NOT in code:
- `app_settings.ai_coaching_prompts` (JSONB) — coaching_styles, interaction_modes, feedback_styles, phases
- `app_settings.ai_scene_template` — Global scene wrapper fallback
- `app_settings.ai_report_prompt` — Report generation template
- `personas.qa_scenario_prompt` — Per-coach scenario generation (uses `{{token}}` placeholders)
- `personas.qa_scene_template` — Per-persona scene wrapper (uses `{{scenario_prompt}}` placeholder)

Token replacement (`{{character_demeanor}}`, `{{conversation_register}}`, etc.) happens on both `system_prompt` and `qa_scenario_prompt`.

### Edge Functions (`supabase/functions/`)
- **`chat/`** — Main AI orchestration: messages, greetings, scenarios, reports. Uses `resolveAIConfig` for hierarchical config (global defaults → task → persona → runtime overrides). Calls Groq API, tracks costs, processes gamification.
- **`_shared/config/ai-config-resolver.ts`** — Hierarchical AI config resolution from database
- **`_shared/groq-client.ts`** — Groq API wrapper (OpenAI-compatible)
- **`_shared/cost-calculator.ts`** — AI usage cost tracking

**Rule**: Use the existing `chat` edge function for AI tasks. Store new prompts/config in the database and call the existing endpoint. Do NOT create new edge functions unless absolutely necessary.

**CRITICAL — JWT verification on `chat` function**: The chat function MUST be deployed with JWT verification disabled. The `config.toml` setting alone is NOT reliable — Supabase's gateway ignores it. You MUST always deploy with the explicit CLI flag:
```bash
supabase functions deploy chat --no-verify-jwt
```
NEVER deploy without `--no-verify-jwt`. If you see `401 Invalid JWT` errors from the function, this is why. Redeploy with the flag.

### Supabase Access — The Right Way

There are three distinct layers of Supabase access. Using the wrong one causes auth failures, RLS violations, or silent data issues.

#### Layer 1: Mobile Client (`lib/supabase.ts`)
Uses anon key + RLS. Imported as `supabase` everywhere in `stores/`, `hooks/`, `components/`.

```typescript
// Direct DB queries (protected by RLS — user can only see own data)
const { data } = await supabase.from('conversations').select('*').eq('user_id', userId);

// Edge function calls — ALWAYS use .functions.invoke(), NEVER direct fetch
const { data, error } = await supabase.functions.invoke('chat', {
  body: { conversationId, userMessage, personaId }
});

// Auth
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();

// RPC calls (server-side functions)
await supabase.rpc('award_xp', { p_user_id: userId, p_amount: 50 });
```

**Common mistakes**:
- Using `fetch()` to call edge functions instead of `supabase.functions.invoke()` — breaks auth header passing
- Forgetting that RLS restricts what the anon key can see — queries return empty, not errors
- Not checking `error` on function invocations (error is separate from data)

#### Layer 2: Edge Functions (`supabase/functions/`)
Auto-injected `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS.

```typescript
// Inside edge functions, create client with service role
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

**Deploy**: `supabase functions deploy chat --no-verify-jwt` (ALWAYS use `--no-verify-jwt` flag — config.toml alone is NOT enough). Timeout on deploy = Supabase server issue, just retry.
**Secrets**: `npx supabase secrets set GROQ_API_KEY=xxx`
**JWT**: The `--no-verify-jwt` deploy flag is REQUIRED. Without it, Supabase gateway returns `401 Invalid JWT` and the function code never executes (no logs appear). This is because the project uses the new `sb_publishable_` key format which is not a valid JWT.

#### Layer 3: CLI Scripts (`scripts/db.sh`, `scripts/migrate.sh`)
For direct DB admin. Uses Management API (primary) with psql pooler fallback.

```bash
# Auth: macOS Keychain or env vars (checked in this order)
# Management API token:
export SUPABASE_ACCESS_TOKEN="xxx"          # or Keychain: "Supabase CLI"
# DB password (psql fallback):
export DIALECTICA_DB_PASSWORD="xxx"         # or Keychain: "dialectica_db"
# Service role key (REST API):
export DIALECTICA_SERVICE_ROLE="xxx"        # or Keychain: "dialectica_service_role"

# Keychain setup (one-time)
security add-generic-password -U -a "$USER" -s "dialectica_db" -w "your-password"
security add-generic-password -U -a "$USER" -s "dialectica_service_role" -w "your-key"

# Database queries
./scripts/db.sh query "SELECT count(*) FROM personas"
./scripts/db.sh describe personas
./scripts/db.sh tables
./scripts/db.sh dump personas 10

# REST API (uses service_role key — PostgREST filter syntax)
./scripts/db.sh select "personas?persona_type=eq.coach&select=name,domain_id"
./scripts/db.sh insert personas '{"name":"Test","persona_type":"coach"}'
./scripts/db.sh update "personas?id=eq.xxx" '{"name":"Updated"}'

# SQL file execution
./scripts/db.sh file supabase/migrations/040_move_prompts_to_database.sql
./scripts/db.sh --yes migrate              # run all pending, skip confirmation

# Migrations
./scripts/migrate.sh status                # show applied vs pending
./scripts/migrate.sh run                   # run all pending
./scripts/migrate.sh run 043              # run specific migration
./scripts/migrate.sh create add_feature   # scaffold next migration (auto-numbered)
./scripts/migrate.sh --dry-run run        # preview without applying
./scripts/migrate.sh rollback             # remove last from tracking (does NOT reverse SQL)
```

**Connection details** (for reference, already in scripts):
- Project ref: `enatcutnrtuauykqyajc`
- Region: `eu-west-2`
- DB host: `aws-1-eu-west-2.pooler.supabase.com`
- DB user: `postgres.enatcutnrtuauykqyajc`

**Script auth flow**: Management API (needs `SUPABASE_ACCESS_TOKEN`) → psql fallback (needs `DIALECTICA_DB_PASSWORD`). If both fail, you'll see "No DB password found" or silent empty results.

### Key Domain Concepts
- **Persona types**: `coach` (24+) and `challenger`
- **Coaching domains**: dating, interviews, presentations, negotiations, difficult_conversations, networking
- **Interaction modes**: `coach_leads`, `user_leads`, `turn_taking`, `question_mode`
- **Session phases**: `roleplay` (in-character) and `feedback` (coaching mode)
- **Q&A mode** (`question_mode`): User starts the conversation, scenario displayed as `system` message (not `assistant`)
- **globalInteractionMode** in chatStore maps `'question'` to `'question_mode'` in DB

### TypeScript Config
- Strict mode enabled
- Path alias: `@/*` maps to project root
- `supabase/` directory is excluded from TS compilation (edge functions use Deno)

### Environment Variables
- `EXPO_PUBLIC_*` — Bundled into mobile app (Supabase URL/key, ElevenLabs key)
- `GROQ_API_KEY` — Set via `npx supabase secrets set` (edge function only)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Auto-injected into edge functions

### Migrations
43+ SQL migrations in `supabase/migrations/`. Key migrations:
- `040` — Database-driven AI prompts (major architectural change)
- `041` — Female personas and expanded coaching domains
- `042` — Immersive chat preference
