-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Extends Supabase auth.users
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_level INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_session_at TIMESTAMPTZ
);

-- User preferences
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  preferred_challenge_intensity INTEGER DEFAULT 5 CHECK (preferred_challenge_intensity BETWEEN 1 AND 10),
  tts_enabled BOOLEAN DEFAULT TRUE,
  voice_input_enabled BOOLEAN DEFAULT FALSE,
  notification_daily_challenge BOOLEAN DEFAULT TRUE,
  notification_time TIME DEFAULT '09:00',
  theme TEXT DEFAULT 'dark',
  preferred_persona_ids UUID[],
  avoided_topics TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERSONAS
-- ============================================

CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  avatar_url TEXT NOT NULL,
  avatar_thumbnail_url TEXT,

  -- Voice configuration
  voice_provider TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_speed DECIMAL DEFAULT 1.0,
  voice_pitch DECIMAL DEFAULT 1.0,
  voice_stability DECIMAL DEFAULT 0.75,

  -- Personality metrics (0-100)
  warmth INTEGER DEFAULT 50,
  directness INTEGER DEFAULT 50,
  patience INTEGER DEFAULT 50,
  humor INTEGER DEFAULT 30,
  formality INTEGER DEFAULT 50,

  -- Behavior
  challenge_style TEXT NOT NULL,
  specialty_areas TEXT[],
  cultural_background TEXT,
  system_prompt TEXT NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id),

  -- Session metadata
  title TEXT,
  topic TEXT,
  starter_prompt_id UUID,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Analysis summary (populated on completion)
  analysis_summary JSONB,
  overall_score INTEGER,

  -- Indexes for performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON public.conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_status ON public.conversations(user_id, status);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Audio (if TTS used)
  audio_url TEXT,
  audio_duration_ms INTEGER,

  -- Real-time analysis (attached to user messages)
  analysis JSONB,

  -- Ordering
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, sequence);

-- ============================================
-- CONVERSATION STARTERS
-- ============================================

CREATE TABLE public.conversation_starters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  prompt_text TEXT NOT NULL,
  category TEXT NOT NULL,

  -- Targeting
  difficulty_level INTEGER DEFAULT 5 CHECK (difficulty_level BETWEEN 1 AND 10),
  recommended_personas UUID[],
  topics TEXT[],

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  avg_engagement_score DECIMAL,

  -- Admin
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  starter_id UUID NOT NULL REFERENCES public.conversation_starters(id),
  challenge_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  conversation_id UUID REFERENCES public.conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, challenge_date)
);

-- ============================================
-- ANALYSIS & GROWTH TRACKING
-- ============================================

-- Individual analysis items detected in messages
CREATE TABLE public.analysis_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,

  -- What was detected
  item_type TEXT NOT NULL, -- 'fallacy', 'bias', 'gender_dynamic', 'racial_assumption', 'strength'
  item_code TEXT NOT NULL, -- e.g., 'ad_hominem', 'confirmation_bias', 'dismissive_language'
  item_label TEXT NOT NULL, -- Human-readable name

  -- Severity/importance
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'significant')),

  -- Context
  text_excerpt TEXT,
  explanation TEXT,
  coaching_suggestion TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_message ON public.analysis_items(message_id);

-- Aggregated patterns over time
CREATE TABLE public.user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Pattern identification
  pattern_type TEXT NOT NULL,
  pattern_code TEXT NOT NULL,

  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Trend
  trend TEXT CHECK (trend IN ('improving', 'stable', 'worsening')),
  improvement_percentage DECIMAL,

  UNIQUE(user_id, pattern_type, pattern_code)
);

CREATE INDEX idx_patterns_user ON public.user_patterns(user_id, pattern_type);

-- Growth metrics snapshots
CREATE TABLE public.growth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Scores (0-100)
  logical_reasoning_score INTEGER,
  bias_awareness_score INTEGER,
  perspective_taking_score INTEGER,
  emotional_regulation_score INTEGER,
  overall_score INTEGER,

  -- Detailed breakdown
  metrics_breakdown JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own challenges" ON public.daily_challenges
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analysis" ON public.analysis_items
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own patterns" ON public.user_patterns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own snapshots" ON public.growth_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Personas are public read
CREATE POLICY "Anyone can view active personas" ON public.personas
  FOR SELECT USING (is_active = TRUE);

-- Starters are public read
CREATE POLICY "Anyone can view active starters" ON public.conversation_starters
  FOR SELECT USING (is_active = TRUE);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create user profile and preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
