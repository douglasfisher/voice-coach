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

## React Compiler warning on react-hook-form

`form.watch()` triggers a "Compilation Skipped: Use of incompatible
library" warning under Next 16's React Compiler. Not actionable from our
side until react-hook-form publishes Compiler-compatible exports. The
warning is informational — runtime behaviour is correct.
