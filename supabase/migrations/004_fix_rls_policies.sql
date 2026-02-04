-- Fix RLS policies to properly handle INSERT operations
-- The original policies used FOR ALL with USING which doesn't work correctly for INSERT

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Users can view own analysis" ON public.analysis_items;
DROP POLICY IF EXISTS "Users can view own patterns" ON public.user_patterns;
DROP POLICY IF EXISTS "Users can view own snapshots" ON public.growth_snapshots;

-- User profiles: users can read/update their own, insert handled by trigger
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences
CREATE POLICY "Users can read own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversations
CREATE POLICY "Users can read own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- Daily challenges
CREATE POLICY "Users can read own challenges" ON public.daily_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.daily_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- Analysis items
CREATE POLICY "Users can read own analysis" ON public.analysis_items
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- User patterns
CREATE POLICY "Users can read own patterns" ON public.user_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns" ON public.user_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns" ON public.user_patterns
  FOR UPDATE USING (auth.uid() = user_id);

-- Growth snapshots
CREATE POLICY "Users can read own snapshots" ON public.growth_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON public.growth_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
