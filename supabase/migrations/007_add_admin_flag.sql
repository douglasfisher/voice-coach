-- Add admin flag to user_profiles
-- This enables role-based access control for the admin panel

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin) WHERE is_admin = true;

-- Comment for documentation
COMMENT ON COLUMN public.user_profiles.is_admin IS 'Whether the user has admin access to the management panel';
