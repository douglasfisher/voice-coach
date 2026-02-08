# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dialectica is a React Native mobile coaching app built with Expo 54, TypeScript, and Supabase. Users practice interpersonal skills (dating, interviews, negotiations, etc.) through AI-powered roleplay conversations with 24+ coaching personas.

## Commands

```bash
# Development
npm run dev:ios          # iOS simulator (creates "Dialectica Dev" iPhone 17 Pro)
npm run fresh            # Fresh iOS build (reset simulator)
npm run dev:android      # Android emulator
npm start                # Expo dev server (web default)

# Code quality
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit

# Build & deploy
npm run build:ios        # EAS build for iOS
npm run build:android    # EAS build for Android
npm run submit:ios       # Submit to App Store

# Edge functions
npx supabase functions deploy <function-name>  # Deploy edge function
npx supabase secrets set KEY=value             # Set edge function secrets
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

### Supabase Client Usage
- Client-side: `supabase` from `lib/supabase.ts` for direct DB queries
- Edge function calls: `supabase.functions.invoke('chat', { body })` — NOT direct fetch
- Auth uses AsyncStorage for token persistence

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
