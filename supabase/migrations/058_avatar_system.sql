-- Migration 058: Avatar System
-- Storage bucket + avatar_library table for AI-generated persona avatars

-- =============================================================================
-- 1. STORAGE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'persona-avatars',
  'persona-avatars',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read access for persona avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'persona-avatars');

-- Admin-only upload
CREATE POLICY "Admin upload persona avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'persona-avatars'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin-only delete
CREATE POLICY "Admin delete persona avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'persona-avatars'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =============================================================================
-- 2. AVATAR LIBRARY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.avatar_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  prompt TEXT,
  params JSONB,
  gender TEXT,
  ethnicity TEXT,
  created_by UUID REFERENCES auth.users(id),
  used_by_persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_library ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin select avatar_library"
  ON public.avatar_library FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admin insert avatar_library"
  ON public.avatar_library FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admin update avatar_library"
  ON public.avatar_library FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admin delete avatar_library"
  ON public.avatar_library FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Indexes
CREATE INDEX idx_avatar_library_gender ON public.avatar_library(gender);
CREATE INDEX idx_avatar_library_unused ON public.avatar_library(used_by_persona_id) WHERE used_by_persona_id IS NULL;
