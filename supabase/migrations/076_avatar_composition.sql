-- ============================================================================
-- Migration 076: Avatar composition target — silhouette + safe zone.
--
-- Seeds app_settings.ai_avatar_composition with:
--   * target_aspect ("3:4")
--   * safe_zone — percentage-based head/shoulder placement, used to render
--     an SVG overlay so admins can compare generated drafts to the target
--     framing at a glance.
--   * silhouette_svg — head + shoulders outline, ViewBox 0 0 100 133.33,
--     stroke-only (uses currentColor so light/dark themes both work).
--
-- The silhouette is UI-only: it is overlaid on draft thumbnails and inside
-- the crop modal. It is NOT sent to the FLUX draft model — FLUX.dev's plain
-- referenceImages field is silently ignored on text-to-image, and ControlNet
-- adds cost/complexity for marginal gain. The deterministic crop step is
-- the framing control. The hi-res ("nano banana") model receives the
-- cropped image as a referenceImage in the existing upscale path.
-- ============================================================================

INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_avatar_composition',
  '{
    "target_aspect": "3:4",
    "safe_zone": {
      "head_top_pct": 12,
      "head_height_pct": 32,
      "shoulders_top_pct": 44,
      "shoulders_height_pct": 56,
      "horizontal_center_pct": 50,
      "head_width_pct": 28
    },
    "silhouette_svg": "<svg viewBox=\"0 0 100 133.33\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"0.6\"><ellipse cx=\"50\" cy=\"33\" rx=\"14\" ry=\"20\"/><path d=\"M 22 95 C 22 75, 35 60, 50 60 C 65 60, 78 75, 78 95 L 78 133 L 22 133 Z\"/></svg>"
  }'::jsonb,
  'Avatar composition target: SVG silhouette + safe-zone percentages used to render a head/shoulders overlay on draft previews. Source of truth shared with the (future) mobile silhouette overlay. Editable later via admin AI-config UI.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
