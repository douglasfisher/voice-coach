-- ============================================================================
-- Migration 031: Prompt Trait Token System
-- Creates trait_categories, trait_options, conversation_traits tables
-- Seeds: character_demeanor (9), conversation_register (5),
--         response_length (5), response_depth (5)
-- ============================================================================

-- 1. TRAIT CATEGORIES
CREATE TABLE trait_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  applies_to TEXT[] DEFAULT '{coach,challenger}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TRAIT OPTIONS
CREATE TABLE trait_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES trait_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_modifier TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(category_id, slug)
);

-- 3. CONVERSATION TRAITS (selections per conversation)
CREATE TABLE conversation_traits (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  trait_option_id UUID NOT NULL REFERENCES trait_options(id),
  PRIMARY KEY (conversation_id, trait_option_id)
);

-- 4. RLS POLICIES
ALTER TABLE trait_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trait_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_traits ENABLE ROW LEVEL SECURITY;

-- Public read on categories and options (anyone can see available traits)
CREATE POLICY "trait_categories_public_read" ON trait_categories
  FOR SELECT USING (true);

CREATE POLICY "trait_options_public_read" ON trait_options
  FOR SELECT USING (true);

-- Authenticated users can read/write their own conversation traits
CREATE POLICY "conversation_traits_auth_read" ON conversation_traits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "conversation_traits_auth_insert" ON conversation_traits
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "conversation_traits_auth_delete" ON conversation_traits
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- --------------------------------------------------------------------------
-- CATEGORY 1: Character Demeanor
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'character_demeanor',
  'Character Demeanor',
  'Controls the personality and energy level of the character in conversation',
  '{coach,challenger}',
  1
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('timid', 'Timid', 'Very hesitant, barely speaks unless directly addressed',
   'Respond with extreme hesitance. Use very short replies — a few words at most. Avoid initiating topics. Only open up if they are exceptionally patient and kind. Trail off mid-sentence sometimes.',
   false, 1),
  ('shy', 'Shy', 'Reserved and hesitant, warms up gradually',
   'Respond with shyness. Give shorter responses. Don''t ask many questions. Warm up gradually only if they''re friendly and patient. Let them carry the conversation.',
   false, 2),
  ('reserved', 'Reserved', 'Measured and thoughtful, not overly expressive',
   'Be measured and deliberate in responses. Don''t volunteer extra information. Answer what''s asked without elaboration. Show warmth through substance, not enthusiasm.',
   false, 3),
  ('neutral', 'Neutral', 'Natural persona behavior — no personality override',
   '',
   true, 4),
  ('friendly', 'Friendly', 'Warm and approachable, easy to talk to',
   'Be warm and approachable. Show genuine interest in what they say. Use a conversational, easygoing tone. Smile through your words.',
   false, 5),
  ('enthusiastic', 'Enthusiastic', 'Energetic and eager, loves the conversation',
   'Bring high energy and genuine excitement to the conversation. Be expressive and animated. Show enthusiasm about their ideas and contributions. Be encouraging without being fake.',
   false, 6),
  ('confident', 'Confident', 'Self-assured and composed, naturally commanding',
   'Carry yourself with calm self-assurance. Speak clearly and unhurriedly. Be selective about engagement. Have your own opinions and don''t waver easily. Project quiet strength.',
   false, 7),
  ('bold', 'Bold', 'Direct and assertive, takes charge',
   'Be direct and assertive. Take the lead in the conversation. State opinions firmly. Don''t hedge or soften excessively. Challenge them when appropriate.',
   false, 8),
  ('flirty', 'Flirty', 'Playfully teasing, charming energy',
   'Be playfully teasing and charming. Use light humor and witty observations. Show interest through playful banter. Keep it tasteful — charm, not sleaze. Let there be a spark in the conversation.',
   false, 9)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'character_demeanor';

-- --------------------------------------------------------------------------
-- CATEGORY 2: Conversation Register
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'conversation_register',
  'Conversation Level',
  'Controls vocabulary, complexity, and social register of speech',
  '{coach,challenger}',
  2
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('casual', 'Casual', 'Relaxed, informal — like texting a friend',
   'Use relaxed, everyday language. Short sentences. Slang is fine. Talk like friends at a bar. No formality.',
   false, 1),
  ('everyday', 'Everyday', 'Natural conversational speech — no override',
   '',
   true, 2),
  ('professional', 'Professional', 'Clear and polished, workplace-appropriate',
   'Use clear, professional language. Moderate vocabulary. Structured but not stiff. Speak like a colleague in a meeting.',
   false, 3),
  ('academic', 'Academic', 'Sophisticated vocabulary, complex ideas',
   'Use sophisticated vocabulary and complex sentence structures. Reference frameworks and theories when relevant. Speak like a well-read professor.',
   false, 4),
  ('eloquent', 'Eloquent', 'Refined, articulate, almost literary',
   'Use refined, articulate language with rich vocabulary. Construct elegant sentences. Be precise and expressive. Speak with the care of a skilled writer.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'conversation_register';

-- --------------------------------------------------------------------------
-- CATEGORY 3: Response Length
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'response_length',
  'Response Length',
  'Controls how long or short the AI responses are',
  '{coach,challenger}',
  3
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('terse', 'Terse', 'Ultra-brief — just a few words per response',
   'Keep responses extremely short — a few words to one sentence maximum. Be blunt and economical. No filler, no elaboration.',
   false, 1),
  ('brief', 'Brief', 'Short and to the point — 1–2 sentences',
   'Keep responses to 1–2 sentences. Be concise and direct. Say what needs to be said, nothing more.',
   false, 2),
  ('balanced', 'Balanced', 'Natural length — no override',
   '',
   true, 3),
  ('detailed', 'Detailed', 'Fuller responses — 3–5 sentences',
   'Give fuller responses of 3–5 sentences. Provide context and nuance. Elaborate on your points while staying focused.',
   false, 4),
  ('expansive', 'Expansive', 'Thorough and in-depth responses',
   'Give thorough, in-depth responses. Explore ideas fully. Provide examples, context, and multiple angles. Don''t rush — take the space you need to be comprehensive.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'response_length';

-- --------------------------------------------------------------------------
-- CATEGORY 4: Response Depth
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'response_depth',
  'Response Depth',
  'Controls the thoughtfulness, engagement level, and intellectual depth of responses',
  '{coach,challenger}',
  4
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('shallow', 'Shallow', 'Surface-level, light conversation only',
   'Keep things surface-level and light. Don''t dig into deeper meaning. Respond to what''s said at face value. Small talk energy.',
   false, 1),
  ('surface', 'Surface', 'Straightforward, doesn''t overthink',
   'Be straightforward and practical. Don''t overanalyze. Address what''s in front of you without reading too deeply into things.',
   false, 2),
  ('natural', 'Natural', 'Balanced engagement — no override',
   '',
   true, 3),
  ('engaging', 'Engaging', 'Thoughtful, asks good follow-ups',
   'Be genuinely thoughtful and engaged. Ask insightful follow-up questions. Notice what they''re really saying beneath the surface. Show you''re truly listening.',
   false, 4),
  ('deep', 'Deep', 'Philosophical, probes beneath the surface',
   'Go deep. Explore the underlying meaning, assumptions, and implications of what they say. Ask questions that make them think. Connect ideas across topics. Be intellectually curious and probing.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'response_depth';
