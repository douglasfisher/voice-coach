# Follow-ups

Durable record of known follow-ups deferred during the persona-admin
buildout. Each item lists what, why, and where to start.

## Mobile app — read AI persona prompts from app_settings

**Status:** ✅ Done in commit on `feature/admin-web-app`. Mobile's
`stores/wizardStore.ts` reads `app_settings.ai_persona_generator` via
`lib/personaGenerator.ts`. Hardcoded fallback retained for offline.

**Carried-over inconsistency (NOT fixed):** the system_prompt template
references trait tokens (`vocabulary_complexity`, `emotional_tone`,
`response_pacing`, `cultural_context`) that aren't in the runtime
`TRAIT_TOKENS` list. Captured below as a separate item.

## Trait token reconciliation

The runtime `TRAIT_TOKENS` list (12 items: `character_demeanor`,
`conversation_register`, `response_length`, `response_depth`,
`humor_style`, `challenge_intensity`, `emotional_attunement`,
`directness`, `topic_flexibility`, `question_frequency`,
`energy_mirroring`, `coaching_method`) doesn't match the trait tokens the
**system_prompt generator** asks the AI to embed (`character_demeanor`,
`conversation_register`, `vocabulary_complexity`, `emotional_tone`,
`response_pacing`, `cultural_context`). Generated prompts include tokens
the runtime never interpolates.

Two paths:
1. Expand the runtime list to include the four extra tokens.
2. Rewrite the system_prompt meta-prompt to reference only the 12 real
   tokens.

Pre-existing in mobile; preserved verbatim during the migration to
DB-driven prompts. Path 2 is probably cheaper — edit the user_template at
`/admin/ai-config/persona-generator` and remove the four tokens from the
"Includes these trait token placeholders…" list.

## Mobile silhouette overlay parity

The web admin's avatar-cropper renders the silhouette overlay (from
`app_settings.ai_avatar_composition`) on every draft preview. Mobile
doesn't read that row yet — drafts on mobile show no overlay.

To wire it: add `ai_avatar_composition` to `AppSettingsMap` (typed),
fetch in `WizardStepAvatar`, render an absolute-positioned `<View>` over
the draft tiles that injects the SVG.

## Mobile constraints in Generate dialog

The web Generate-persona dialog accepts pre-flight constraints (gender,
type, age_range, ethnicity, appearance) that the AI is instructed to
respect. Mobile's wizard has no equivalent UI. When mobile is rebuilt
to use `app_settings.ai_persona_generator`, consider adding the same
constraint selects to its dialog and threading them through as a
`constraints` payload — the persona-details endpoint already supports
this server-side.

## Avatar library browser

`avatar_library` table accumulates every Runware draft + hi-res; we
write to it from the web admin's generate route, but there's no
browser UI. Spec was drafted (group by `generation_batch_id`, filter by
gender, mark used vs unused) but not built. Let admins re-pick a past
draft without spending Runware credits.

Suggested entrypoint: a new tab on the Avatar tab labelled "Library"
that lazy-loads when opened, with a 3-column grid grouped by batch.

## AI config — JSONB editors for the rest

Three `app_settings.*` rows still require SQL to edit:
- `ai_avatar_options` — 9 parameter option arrays + defaults
- `ai_avatar_config` — Runware models + dimensions + prompt templates
- `ai_coaching_prompts` — coaching styles, interaction modes, feedback
  styles, phases (huge, used at chat time)

Pattern is well-established now (avatar-composition, persona-generator,
voice-defaults all follow the same structure). Build as needed.

## Trait token reconciliation in mobile mode prompts

Migration 070 added `mode_prompts` jsonb on personas. Web admin doesn't
expose this yet — mode-specific prompt overrides (coach_leads vs
turn_taking etc.) are SQL-only edits today. Worth a JSONB editor on the
Prompts tab.

## Subscriptions / pricing UI

Sidebar links to `/admin/subscriptions` and the page doesn't exist yet
(404). Was on the original spec but no slice has built it. Route handler
+ page are needed; drives off `user_profiles.is_premium` plus whatever
billing source-of-truth we settle on (currently no integration).

## Hard delete persona — orphan conversations

`DELETE /api/admin/personas/[id]?hard=true` removes the row but leaves
`conversations.persona_id` pointing at nothing. RLS + the chat function
already tolerate this (persona_id is non-null FK without cascade). For
hygiene: either set FK to ON DELETE SET NULL, or surface a count of
orphaned conversations in the confirm dialog.

## AI cost tracking — making it watertight

### P0 — meaningful cost we don't currently see

#### TTS (ElevenLabs) tracking
Mobile calls ElevenLabs directly from the client with a public env key
(`lib/tts.ts`). Zero visibility into spoken-response spend, which at
scale is likely a **larger line item than chat itself**.

Two paths:
1. **Quick win** — add a `record-tts-usage` RPC the client calls after
   each successful TTS; insert an `ai_usage` row with
   `task_type='tts'`, `model='elevenlabs:turbo_v2_5'`, character count
   in `prompt_tokens`. Trust-the-client, but quick.
2. **Right way** — proxy TTS through a new edge function that calls
   ElevenLabs server-side and writes the row authoritatively. Removes
   the public API key from the bundle (which is currently leaked
   anyway). Bigger change but eliminates a real security gap too.

Recommend path 2 — kill the leaked API key in the same change.

#### Mobile-initiated avatar generation
The `runware` edge function uploads to storage but never writes
`ai_usage`. Web admin's avatar routes do (added in slice C), but the
mobile wizard's avatar gen flows through the edge function with no
recording. Same fix as the chat function: add `recordAIUsage` calls in
`runware/index.ts` after each successful image, with
`task_type='image_generation'`, cost from Runware's response, and
`user_id` from `auth.uid()`.

### P1 — per-user attribution + quota enforcement

#### Subscription tier on `user_profiles`
`app_settings` ships `daily_token_limit_free=50000` and
`daily_token_limit_premium=500000` but there's no `tier` column on
`user_profiles` to look up. Add:
```sql
ALTER TABLE user_profiles
  ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free'
  CHECK (subscription_tier IN ('free','premium','enterprise'));
```
Then enforce in the chat edge function: read tier + daily token sum,
reject with 429 if over.

#### Per-user spend drill-down
`/admin/users/[id]` already has tabs (Profile, Conversations, Auth);
add a fourth — **Spend**. Last 30 days, cost-per-day chart, breakdown
by task_type and persona, list of conversations sorted by cost.
Single SQL group-by from `ai_usage` filtered by user_id; UI mirrors
`/admin/usage` patterns.

#### Cost report export
"Export CSV" button on `/admin/usage` and the per-user spend page.
Standard rows so finance can drop them into a spreadsheet.

### P2 — persona tuning + efficiency

#### Per-persona cost dashboard
A new tab on `/admin/personas/[id]` showing:
- Total spend, total conversations, **$/conversation**, **avg
  tokens/turn**
- Ratio of cost vs. completion rate (sessions that ended cleanly
  vs. abandoned mid-flow)
- Recent expensive conversations for spot-checking the prompt

Highlights cost-heavy personas that need prompt tuning. Same SQL
pattern as the usage page; new server component, ~150 lines.

#### Latency tracking
Add a `latency_ms` column to `ai_usage` (`int`, nullable). Record the
delta between Groq request start and response complete in the chat
function. Surface p50/p95 latency per persona on the dashboard above.
Slow personas are a quality issue separate from cost.

#### Prompt versioning
On every successful `PATCH /api/admin/personas/[id]` that mutates
`system_prompt` or `prompt_sections`, append the previous version to a
new `persona_prompt_history` table:
```sql
CREATE TABLE persona_prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id),
  system_prompt text,
  prompt_sections jsonb,
  edited_at timestamptz DEFAULT now()
);
```
Surfaces a "Restore previous version" UI on the Prompts tab. The
audit log captures *what* changed; this keeps the prompt body itself
recoverable.

#### Trait-impact A/B
A/B testing belongs at a higher layer than the persona row. Defer
until you actually need it — the simpler short-term tool is the
per-persona cost dashboard above. If you do need A/B: add
`prompt_variant` column to `personas` (nullable text) +
`persona_experiments` table; route 50/50 from the chat function.

### P3 — operational hygiene

#### Slack alerts at budget threshold
`notify_on_threshold` and `notify_on_exceeded` are stored on
`ai_budgets` but nothing reads them. Add a Postgres trigger on
`ai_usage` insert that re-computes `current_spend_cents`, compares to
threshold, and posts to a Slack webhook stored in `app_settings`.
Lightweight; doesn't need a server-side cron.

#### Budget enforcement (rejecting requests)
Today budgets are informational. Wire the chat function to read the
active monthly budget once per request and short-circuit with 429 if
`current_spend_cents > limit_cents`. One DB read per request; cache
for 60 s if the read latency matters.

#### Provider failover
Today: Groq down → app down. The chat function's `ai_config` already
has a `fallback_model` field; wire the catch-block to retry once on
any 5xx using the fallback. `ai_models` table has a `provider` column
(currently always `groq`); to support OpenAI/Anthropic add a
provider-aware client in `_shared/`.

#### `/api/admin/*` rate limiting
A compromised admin token could burn through credits before you
notice. Add Upstash Redis (or Vercel KV) rate limit at the middleware
layer: 60 req/min/admin for the AI routes specifically.

#### `current_spend_cents` reconciliation
The budgets page reads live spend from `ai_usage` (correct), but the
stored `current_spend_cents` may drift if the trigger fails. Add a
nightly cron alongside the snapshot job that re-aggregates and writes
the row.

## React Compiler warning on react-hook-form

`form.watch()` triggers a "Compilation Skipped: Use of incompatible
library" warning under Next 16's React Compiler. Not actionable from our
side until react-hook-form publishes Compiler-compatible exports. The
warning is informational — runtime behaviour is correct.
