-- Force PostgREST to reload its schema cache so it picks up
-- columns added in migrations 037 (user_gender, interested_in)
-- and 042 (immersive_chat_enabled)

-- Verify columns exist
DO $$
BEGIN
  -- Add columns if they somehow don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'interested_in') THEN
    ALTER TABLE public.user_preferences ADD COLUMN interested_in TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'user_gender') THEN
    ALTER TABLE public.user_preferences ADD COLUMN user_gender TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'immersive_chat_enabled') THEN
    ALTER TABLE public.user_preferences ADD COLUMN immersive_chat_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
