-- Migration 065: Avatar Hi-Res Composable Config
-- Updates ai_avatar_config.hires from monolithic prompt to composable structure
-- with prompt_template + enhancement-focused creative options.
-- Controls enhance the draft's look/feel (grading, film, retouching, mood)
-- rather than changing photography fundamentals (lighting, lens, DoF).

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{hires}',
  '{
    "prompt_template": "Reconstruct this image as an {{style}}, preserving the exact pose, body position, composition and framing precisely as shown. Apply full human-accurate detail: {{skin}}. Eyes must have realistic iris detail, moisture reflection and precise specular catch lights. Hair should show individual strand separation, natural flyaways and light-transmissive edges. All fabrics and materials must exhibit true-to-life weave texture, weight, drape and surface response to light. Preserve the existing lighting direction and camera perspective exactly as-is. Apply {{film}} colour science, {{retouching}}, {{mood}}. {{detail}}, {{grading}}. {{negative_prompt}}.",
    "style": "Studio portrait",
    "grading": "Cinematic warm",
    "film": "Digital clean",
    "skin": "Hyper-realistic",
    "retouching": "Full editorial",
    "mood": "Clean & polished",
    "detail": "Ultra (150MP)",
    "negative_prompt": "Standard",
    "model": "google:4@2",
    "width": 1792,
    "height": 2400
  }'::jsonb
)
WHERE key = 'ai_avatar_config';
