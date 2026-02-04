-- App Settings Table
-- Global configuration for the application

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can update settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Seed default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('default_model', '"llama-3.3-70b-versatile"', 'Default AI model for new conversations'),
  ('max_tokens_per_request', '1024', 'Maximum tokens per AI request'),
  ('daily_token_limit_free', '50000', 'Daily token limit for free users'),
  ('daily_token_limit_premium', '500000', 'Daily token limit for premium users'),
  ('maintenance_mode', 'false', 'Enable maintenance mode to block new conversations'),
  ('featured_persona_id', 'null', 'ID of featured persona on home screen')
ON CONFLICT (key) DO NOTHING;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.app_settings IS 'Global application configuration settings';
COMMENT ON COLUMN public.app_settings.value IS 'JSONB value - can store any JSON type';
