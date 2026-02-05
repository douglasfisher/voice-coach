-- Cost Markup Setting Migration
-- Adds global percentage markup for AI costs

-- =============================================================================
-- ADD COST MARKUP PERCENTAGE SETTING
-- =============================================================================

-- Add cost markup percentage to app_settings
-- This allows admins to apply a global markup (e.g., for infrastructure costs)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'cost_markup_percent',
  '0',
  'Global percentage markup applied to all AI costs (e.g., 20 = 20% markup)'
)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- ADD COMMENT FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.app_settings IS 'Application configuration settings including AI parameters and cost markup';
