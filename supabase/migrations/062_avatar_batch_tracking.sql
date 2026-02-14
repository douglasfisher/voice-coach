-- Migration 062: Avatar Batch Tracking
-- Adds generation_batch_id to link all avatars from the same generation run,
-- and is_hi_res flag to distinguish upscaled versions from drafts.

ALTER TABLE public.avatar_library
  ADD COLUMN IF NOT EXISTS generation_batch_id UUID,
  ADD COLUMN IF NOT EXISTS is_hi_res BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_avatar_library_batch
  ON public.avatar_library(generation_batch_id);
