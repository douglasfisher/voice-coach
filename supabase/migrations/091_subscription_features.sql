-- ============================================================================
-- Migration 091: Subscription tier feature system.
--
-- Three tables make every aspect of every tier admin-tunable without a
-- redeploy:
--
--   feature_flags     — code-defined catalogue of every feature key the
--                       app gates on. Display name/description editable
--                       from the admin UI; the key + kind + default_value
--                       are owned by code (TS catalogue in
--                       packages/shared-types/src/features.ts) and
--                       kept in sync via migrations like this one.
--
--   tier_metadata     — per-tier display + commercial config (label,
--                       monthly/annual price, marketing description,
--                       sort order, visibility). Seeded with reasonable
--                       defaults; superadmins edit freely.
--
--   tier_features     — per-tier overrides on the feature matrix. Each
--                       row says "this tier overrides this feature with
--                       this value". The resolver in code walks the tier
--                       hierarchy free → freemium → basic → pro →
--                       enterprise → team taking the last-write-wins
--                       override per key, falling back to
--                       feature_flags.default_value.
--
-- Folds the existing app_settings.ai_tier_limits.daily_tokens config
-- into the new system. quota.ts will switch to reading the new system
-- in the next migration; ai_tier_limits stays for one release as a
-- fallback, then is removed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- feature_flags: the catalogue
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_flags (
  key           text PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('boolean', 'number')),
  -- jsonb so we can store boolean true/false OR numeric values OR null
  -- (null on a numeric feature means "unlimited").
  default_value jsonb NOT NULL,
  name          text NOT NULL,
  description   text NOT NULL,
  feature_group text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  -- Soft-delete: we don't want to break tier_features FKs by hard-
  -- deleting a feature that an old client might still resolve.
  deprecated    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE feature_flags IS
  'Catalogue of every feature key the app gates on. Source of truth lives in packages/shared-types/src/features.ts; this table is seeded from there and admins can edit display name / description / sort_order in the matrix UI.';

-- ---------------------------------------------------------------------------
-- tier_metadata: per-tier display + commercial config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tier_metadata (
  tier                  subscription_tier PRIMARY KEY,
  display_name          text NOT NULL,
  short_description     text,
  marketing_description text,
  monthly_price_cents   integer,
  annual_price_cents    integer,
  badge_color           text,
  is_visible_in_pricing boolean NOT NULL DEFAULT true,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tier_metadata IS
  'Per-tier display + commercial config. Edited by admins via the tiers admin UI; consumed by mobile/web for the pricing page and by admin lists for the tier badge label.';

-- ---------------------------------------------------------------------------
-- tier_features: per-tier overrides on the matrix
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tier_features (
  tier        subscription_tier NOT NULL,
  feature_key text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  -- jsonb so a single column carries booleans, numbers, and null (= unlimited).
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (tier, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_tier_features_tier ON tier_features (tier);

COMMENT ON TABLE tier_features IS
  'Per-tier feature overrides. Resolution: walk free → freemium → basic → pro → enterprise → team taking the last override per key. Missing rows = inherit from the lower tier or the catalogue default.';

-- ---------------------------------------------------------------------------
-- RLS: admins write, authenticated users read (mobile needs to resolve
-- its own tier's features at session bootstrap).
-- ---------------------------------------------------------------------------

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_features ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read all three tables. Reads are
-- not sensitive (the catalogue is essentially public; the matrix is
-- exposed to clients anyway since they need to know what they can do).
DROP POLICY IF EXISTS "feature_flags_read_all" ON feature_flags;
CREATE POLICY "feature_flags_read_all" ON feature_flags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tier_metadata_read_all" ON tier_metadata;
CREATE POLICY "tier_metadata_read_all" ON tier_metadata
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tier_features_read_all" ON tier_features;
CREATE POLICY "tier_features_read_all" ON tier_features
  FOR SELECT TO authenticated USING (true);

-- Writes: only admins. Web admin uses the secret-key client which
-- bypasses RLS anyway, but this stops a stolen anon-key client from
-- mutating the matrix.
DROP POLICY IF EXISTS "feature_flags_admin_write" ON feature_flags;
CREATE POLICY "feature_flags_admin_write" ON feature_flags
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "tier_metadata_admin_write" ON tier_metadata;
CREATE POLICY "tier_metadata_admin_write" ON tier_metadata
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "tier_features_admin_write" ON tier_features;
CREATE POLICY "tier_features_admin_write" ON tier_features
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- Seed: feature_flags catalogue.
-- Mirrors packages/shared-types/src/features.ts FEATURE_CATALOGUE.
-- ============================================================================

INSERT INTO feature_flags (key, kind, default_value, name, description, feature_group, sort_order) VALUES
  -- Quotas
  ('daily_tokens',                    'number',  '5000'::jsonb,  'Daily AI tokens',                'Hard cap on combined input + output tokens per UTC day. The chat edge function refuses with 429 when exceeded.',                                'Quotas',              10),
  ('max_lifetime_sessions',           'number',  '5'::jsonb,     'Lifetime sessions',              'Hard cap on conversations the account has ever started. Set to null for unlimited at higher tiers.',                                          'Quotas',              20),
  ('max_conversations_per_day',       'number',  '1'::jsonb,     'Conversations per day',          'Cap on session starts per UTC day. Independent of the lifetime cap.',                                                                          'Quotas',              30),
  ('max_messages_per_conversation',   'number',  '20'::jsonb,    'Messages per conversation',      'Hard limit on the length of a single session before it''s auto-ended.',                                                                        'Quotas',              40),
  ('max_favourite_personas',          'number',  '1'::jsonb,     'Favourite personas',             'How many personas the user can pin / favourite.',                                                                                              'Quotas',              50),
  ('history_retention_days',          'number',  '7'::jsonb,     'History retention (days)',       'Conversations older than this are auto-deleted. null = forever.',                                                                              'Quotas',              60),
  ('concurrent_active_conversations', 'number',  '1'::jsonb,     'Concurrent active sessions',     'How many conversations the user can have in status=active at once.',                                                                           'Quotas',              70),
  -- Personas & content
  ('max_coach_personas_visible',      'number',  '1'::jsonb,     'Coach personas visible',         'How many coach personas the user can browse and start sessions with.',                                                                         'Personas & content',  10),
  ('max_coaching_domains',            'number',  '1'::jsonb,     'Coaching domains',               'How many domains (dating / interviews / negotiations / etc.) the user can access.',                                                            'Personas & content',  20),
  ('challenger_personas_enabled',     'boolean', 'false'::jsonb, 'Challenger personas',            'Counterpart-simulation personas (the marquee differentiator from competitors). Gate at pro per the May 2026 competitive analysis.',          'Personas & content',  30),
  ('advisor_mode_enabled',            'boolean', 'false'::jsonb, 'Advisor mode',                   'Access to advisor personas with intake-style flows.',                                                                                          'Personas & content',  40),
  ('qa_mode_enabled',                 'boolean', 'true'::jsonb,  'Q&A mode',                       'User-leads interaction mode (vs default Practice mode). On for everyone — it''s a Dialectica-specific differentiator.',                     'Personas & content',  50),
  ('daily_challenges_enabled',        'boolean', 'true'::jsonb,  'Daily challenges',               'Daily challenge feed on the home screen. Free-friendly retention loop.',                                                                       'Personas & content',  60),
  ('custom_scenarios_enabled',        'boolean', 'false'::jsonb, 'Custom scenario authoring',      'User-authored scenarios (parity with Tough Tongue AI / VirtualSpeech Roleplay Studio).',                                                       'Personas & content',  70),
  -- Voice
  ('voice_input_enabled',             'boolean', 'false'::jsonb, 'Voice input (STT)',              'Speech-to-text input. Standard tier minimum per market norms.',                                                                                'Voice',               10),
  ('voice_output_enabled',            'boolean', 'false'::jsonb, 'Voice output (TTS)',             'Text-to-speech playback of assistant messages. Standard tier minimum.',                                                                        'Voice',               20),
  ('priority_voice_quality',          'boolean', 'false'::jsonb, 'Priority voice quality',         'Premium ElevenLabs voice tier vs default model. Premium upsell.',                                                                              'Voice',               30),
  -- Models
  ('priority_models_enabled',         'boolean', 'false'::jsonb, 'Priority AI models',             'Routes to the higher-tier model in app_settings.ai_coaching_prompts. Premium upsell.',                                                         'Models',              10),
  -- Analysis & reporting
  ('performance_analysis_enabled',    'boolean', 'false'::jsonb, 'Performance analysis card',      'The session-report Performance Analysis card with derived insights.',                                                                          'Analysis & reporting',10),
  ('emotional_progression_enabled',   'boolean', 'false'::jsonb, 'Emotional progression',          'Per-persona dynamic emotional state across the conversation. Marquee differentiator — make sure paying users see it.',                   'Analysis & reporting',20),
  ('emotional_journey_view_enabled',  'boolean', 'false'::jsonb, 'Emotional journey view',         'Stage trajectory + distribution + timeline in the session report. Premium upsell.',                                                            'Analysis & reporting',30),
  ('detailed_analysis_enabled',       'boolean', 'false'::jsonb, 'Detailed analysis section',      'Long-form analysis paragraph in the session report (otherwise truncated).',                                                                   'Analysis & reporting',40),
  -- Productivity
  ('session_export_enabled',          'boolean', 'false'::jsonb, 'Export transcripts',             'Export conversation transcripts (markdown / PDF).',                                                                                            'Productivity',        10),
  -- Future placeholders
  ('filler_word_analytics_enabled',   'boolean', 'false'::jsonb, 'Filler-word & pacing analytics', 'Yoodli/Speeko-style WPM and filler counts. Not built yet — placeholder so we don''t migrate when it ships.',                                  'Future',              10),
  ('live_meeting_overlay_enabled',    'boolean', 'false'::jsonb, 'Live meeting overlay',           'Real-time desktop coach during Zoom/Meet/Teams calls (Poised / Yoodli flagship). Placeholder.',                                                'Future',              20),
  ('video_avatars_enabled',           'boolean', 'false'::jsonb, 'Video avatars',                  'Lifelike video persona avatars (Yoodli / VirtualSpeech parity). Placeholder.',                                                                 'Future',              30),
  ('web_app_access',                  'boolean', 'false'::jsonb, 'Web app access',                 'Companion web client. Placeholder until built.',                                                                                               'Future',              40),
  -- Team
  ('team_admin_dashboard',            'boolean', 'false'::jsonb, 'Team admin dashboard',           'Org-level user/usage dashboard. Team tier only.',                                                                                              'Team',                10),
  ('team_sso_enabled',                'boolean', 'false'::jsonb, 'SSO',                            'SAML / OIDC for org accounts. Enterprise/team.',                                                                                               'Team',                20),
  ('team_custom_scenarios',           'boolean', 'false'::jsonb, 'Org-shared custom scenarios',    'Custom scenarios authored by org admins, shared to all seats.',                                                                                'Team',                30)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Seed: tier_metadata.
-- Pricing reflects the May 2026 competitive analysis recommendation
-- (Standard ~$14.99/mo, Premium ~$24.99/mo, Teams ~$29/seat/mo).
-- Admins should adjust as competitors move.
-- ============================================================================

INSERT INTO tier_metadata (tier, display_name, short_description, marketing_description, monthly_price_cents, annual_price_cents, badge_color, sort_order, is_visible_in_pricing) VALUES
  ('free',
    'Free',
    'Try the basics',
    'A few sessions a day with one coach to see if Dialectica fits your practice. No card required.',
    0, 0, '#6B7280', 10, true),
  ('freemium',
    'Free+',
    'Email-confirmed evaluation',
    'A bit more headroom for users who confirmed their email — try multiple coaches across two domains.',
    0, 0, '#6B7280', 20, false),
  ('basic',
    'Standard',
    'Voice + full coach library',
    'Voice input + output, every coach across every domain, full session reports. The everyday tier.',
    1499, 8999, '#3B82F6', 30, true),
  ('pro',
    'Premium',
    'Counterpart roleplay + power features',
    'Everything in Standard, plus challenger personas (counterpart simulation), custom scenarios, the highest-quality voices, and emotional-journey insights.',
    2499, 14900, '#F59E0B', 40, true),
  ('enterprise',
    'Enterprise',
    'Custom — talk to us',
    'For large orgs that need SSO, custom contracts, and high quotas. Pricing is per-seat, negotiated.',
    NULL, NULL, '#10B981', 60, true),
  ('team',
    'Teams',
    'Per-seat with admin dashboard',
    'For small teams: admin dashboard, org-shared scenarios, SSO. $29/seat/mo.',
    2900, 27600, '#8B5CF6', 50, true)
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- Seed: tier_features matrix.
-- Mirrors packages/shared-types/src/features.ts INITIAL_TIER_MATRIX.
-- Only entries that diverge from the next-lower tier (or the catalogue
-- default) need to be present — admins can fill in more later.
-- ============================================================================

INSERT INTO tier_features (tier, feature_key, value) VALUES
  -- free
  ('free', 'daily_tokens',                    '5000'::jsonb),
  ('free', 'max_lifetime_sessions',           '5'::jsonb),
  ('free', 'max_conversations_per_day',       '1'::jsonb),
  ('free', 'max_messages_per_conversation',   '20'::jsonb),
  ('free', 'max_favourite_personas',          '1'::jsonb),
  ('free', 'max_coach_personas_visible',      '1'::jsonb),
  ('free', 'max_coaching_domains',            '1'::jsonb),
  ('free', 'history_retention_days',          '7'::jsonb),
  ('free', 'concurrent_active_conversations', '1'::jsonb),
  ('free', 'qa_mode_enabled',                 'true'::jsonb),
  ('free', 'daily_challenges_enabled',        'true'::jsonb),
  -- freemium
  ('freemium', 'daily_tokens',                  '25000'::jsonb),
  ('freemium', 'max_lifetime_sessions',         'null'::jsonb),
  ('freemium', 'max_conversations_per_day',     '3'::jsonb),
  ('freemium', 'max_messages_per_conversation', '50'::jsonb),
  ('freemium', 'max_favourite_personas',        '3'::jsonb),
  ('freemium', 'max_coach_personas_visible',    '6'::jsonb),
  ('freemium', 'max_coaching_domains',          '2'::jsonb),
  ('freemium', 'history_retention_days',        '30'::jsonb),
  ('freemium', 'performance_analysis_enabled',  'true'::jsonb),
  -- basic
  ('basic', 'daily_tokens',                    '200000'::jsonb),
  ('basic', 'max_conversations_per_day',       'null'::jsonb),
  ('basic', 'max_messages_per_conversation',   'null'::jsonb),
  ('basic', 'max_favourite_personas',          'null'::jsonb),
  ('basic', 'max_coach_personas_visible',      'null'::jsonb),
  ('basic', 'max_coaching_domains',            'null'::jsonb),
  ('basic', 'history_retention_days',          'null'::jsonb),
  ('basic', 'concurrent_active_conversations', '3'::jsonb),
  ('basic', 'voice_input_enabled',             'true'::jsonb),
  ('basic', 'voice_output_enabled',            'true'::jsonb),
  ('basic', 'advisor_mode_enabled',            'true'::jsonb),
  ('basic', 'emotional_progression_enabled',   'true'::jsonb),
  ('basic', 'detailed_analysis_enabled',       'true'::jsonb),
  -- pro
  ('pro', 'daily_tokens',                       '1000000'::jsonb),
  ('pro', 'concurrent_active_conversations',    'null'::jsonb),
  ('pro', 'challenger_personas_enabled',        'true'::jsonb),
  ('pro', 'custom_scenarios_enabled',           'true'::jsonb),
  ('pro', 'priority_voice_quality',             'true'::jsonb),
  ('pro', 'priority_models_enabled',            'true'::jsonb),
  ('pro', 'emotional_journey_view_enabled',     'true'::jsonb),
  ('pro', 'session_export_enabled',             'true'::jsonb),
  -- enterprise
  ('enterprise', 'daily_tokens',     '5000000'::jsonb),
  ('enterprise', 'team_sso_enabled', 'true'::jsonb),
  -- team
  ('team', 'daily_tokens',           '5000000'::jsonb),
  ('team', 'team_admin_dashboard',   'true'::jsonb),
  ('team', 'team_sso_enabled',       'true'::jsonb),
  ('team', 'team_custom_scenarios',  'true'::jsonb)
ON CONFLICT (tier, feature_key) DO NOTHING;
