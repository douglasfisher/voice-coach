-- Migration 064: Avatar generation config in app_settings
-- Moves hardcoded avatar generation prompts/settings from wizardStore.ts to database

INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_avatar_config',
  '{
    "draft": {
      "prompt_template": "A classic mid-length head and shoulders portrait of a {{appearance}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}, {{pose}} composition, lit with {{lighting}} lighting on a dark charcoal background with space around. Shot on {{camera}}.",
      "negative_prompt": "cartoon, anime, 3d render, distorted, blurry, low quality, text, watermark",
      "model": "runware:400@1",
      "width": 896,
      "height": 1152,
      "number_results": 4,
      "cfg_scale": 3.5,
      "scheduler": "FlowMatchEulerDiscreteScheduler"
    },
    "hires": {
      "prompt": "Reconstruct this image as an ultra-photorealistic studio photograph, preserving the exact pose, body position, composition and framing precisely as shown. Apply full human-accurate detail: natural skin with visible pores, fine vellus hair, subsurface light scattering, authentic skin imperfections and micro-texture variation. Eyes must have realistic iris detail, moisture reflection and precise specular catch lights. Hair should show individual strand separation, natural flyaways and light-transmissive edges. All fabrics and materials must exhibit true-to-life weave texture, weight, drape and surface response to light. Render with three-point studio lighting — defined key light with natural falloff, subtle fill preserving shadow detail, and rim/hair light for subject-background separation. Accurate specular highlights, contact shadows, ambient occlusion and global illumination throughout. Shot on medium format digital, 80mm lens, f/2.8 shallow depth of field, 150MP resolution, cinematic colour grading with editorial-grade retouching. No AI artifacts, no plastic skin, no uncanny smoothing.",
      "model": "google:4@2",
      "width": 1792,
      "height": 2400
    }
  }'::jsonb,
  'Avatar generation config for draft and hi-res image generation (models, prompts, dimensions)'
)
ON CONFLICT (key) DO NOTHING;
