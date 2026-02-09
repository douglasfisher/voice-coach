-- Migration 049: User Feedback System
-- TikTok-style screenshot feedback: table, storage bucket, RLS

-- ============================================================
-- 1. user_feedback table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'other')),
  message TEXT NOT NULL,
  screenshot_path TEXT,
  current_route TEXT,
  app_version TEXT,
  device_model TEXT,
  os_version TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- ============================================================
-- 2. RLS Policies
-- ============================================================
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON user_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update feedback (status, admin_notes)
CREATE POLICY "Admins can update feedback"
  ON user_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================
-- 3. Storage bucket for feedback screenshots
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,  -- 5MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Users can upload screenshots to their own folder
CREATE POLICY "Users can upload feedback screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own screenshots
CREATE POLICY "Users can view own feedback screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all feedback screenshots
CREATE POLICY "Admins can view all feedback screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-screenshots'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
