-- Migration 065: Avatar Hi-Res Composable Config
-- Updates ai_avatar_config.hires from monolithic prompt to composable structure
-- with prompt_template + individual creative option keys.

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{hires}',
  '{
    "prompt_template": "Reconstruct this image as an {{style}}, preserving the exact pose, body position, composition and framing precisely as shown. Apply full human-accurate detail: {{skin}}. Eyes must have realistic iris detail, moisture reflection and precise specular catch lights. Hair should show individual strand separation, natural flyaways and light-transmissive edges. All fabrics and materials must exhibit true-to-life weave texture, weight, drape and surface response to light. Render with {{lighting}}. Accurate specular highlights, contact shadows, ambient occlusion and global illumination throughout. {{camera}}, {{dof}}, {{detail}}, {{grading}} with editorial-grade retouching. {{negative_prompt}}.",
    "style": "Studio portrait",
    "grading": "Cinematic warm",
    "lighting": "Three-point studio",
    "skin": "Hyper-realistic",
    "dof": "Portrait f/2.8",
    "camera": "Medium format 80mm",
    "detail": "Ultra (150MP)",
    "negative_prompt": "Standard",
    "model": "google:4@2",
    "width": 1792,
    "height": 2400
  }'::jsonb
)
WHERE key = 'ai_avatar_config';
