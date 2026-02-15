/**
 * Avatar Hi-Res Option Maps & Prompt Builder
 *
 * Composable creative controls for hi-res avatar generation.
 * Each map: UI label → prompt fragment.
 */

import { AvatarHiresConfig } from './admin';

export const PHOTOGRAPHY_STYLE_OPTIONS: Record<string, string> = {
  'Studio portrait': 'ultra-photorealistic studio photograph',
  'Editorial fashion': 'editorial fashion photograph with high-end magazine styling',
  'Fine art': 'fine art portrait with painterly quality and artistic composition',
  'Cinematic': 'cinematic film still with dramatic atmosphere and story',
  'Natural light portrait': 'natural light portrait with organic, authentic feel',
};

export const COLOR_GRADING_OPTIONS: Record<string, string> = {
  'Cinematic warm': 'cinematic colour grading with warm tones',
  'Cool editorial': 'cool editorial colour grading with blue-silver tones',
  'High contrast': 'high contrast colour grading with deep blacks and bright highlights',
  'Muted film': 'muted film stock colour grading with desaturated palette',
  'Natural': 'natural colour grading with true-to-life tones',
  'Rich & saturated': 'rich saturated colour grading with vibrant hues',
};

export const LIGHTING_SETUP_OPTIONS: Record<string, string> = {
  'Three-point studio': 'three-point studio lighting — defined key light with natural falloff, subtle fill preserving shadow detail, and rim/hair light for subject-background separation',
  'Dramatic rim': 'dramatic rim lighting with strong backlight edge separation and moody shadows',
  'Soft diffused': 'soft diffused lighting with even illumination and minimal shadows',
  'High key': 'high key lighting with bright, even exposure and minimal shadow',
  'Natural window': 'natural window lighting with soft directional quality and gentle falloff',
  'Rembrandt': 'Rembrandt lighting with characteristic triangle of light under the eye and rich shadows',
};

export const SKIN_RENDERING_OPTIONS: Record<string, string> = {
  'Hyper-realistic': 'natural skin with visible pores, fine vellus hair, subsurface light scattering, authentic skin imperfections and micro-texture variation',
  'Natural': 'natural skin texture with realistic detail and subtle imperfections',
  'Softened editorial': 'softened editorial skin with gentle retouching preserving natural texture',
  'Magazine retouched': 'magazine-grade retouched skin with smooth even complexion',
};

export const DEPTH_OF_FIELD_OPTIONS: Record<string, string> = {
  'Shallow f/1.4': 'f/1.4 ultra-shallow depth of field with creamy bokeh',
  'Portrait f/2.8': 'f/2.8 shallow depth of field',
  'Moderate f/4': 'f/4 moderate depth of field with subtle background separation',
  'Deep f/8': 'f/8 deep depth of field with sharp background detail',
};

export const CAMERA_FORMAT_OPTIONS: Record<string, string> = {
  'Medium format 80mm': 'shot on medium format digital, 80mm lens',
  '85mm portrait': 'shot on 85mm portrait lens',
  '50mm standard': 'shot on 50mm standard lens',
  '105mm telephoto': 'shot on 105mm telephoto lens',
};

export const DETAIL_LEVEL_OPTIONS: Record<string, string> = {
  'Ultra (150MP)': '150MP resolution',
  'High (100MP)': '100MP resolution',
  'Medium (50MP)': '50MP resolution',
};

export const NEGATIVE_STYLE_OPTIONS: Record<string, string> = {
  'Standard': 'No AI artifacts, no plastic skin, no uncanny smoothing',
  'Strict': 'No AI artifacts, no plastic skin, no uncanny smoothing, no distortion, no blurring, no cartoon, no anime, no 3d render',
  'Minimal': 'No AI artifacts',
};

/** All option maps keyed by config field name */
export const HIRES_OPTION_MAPS = {
  style: PHOTOGRAPHY_STYLE_OPTIONS,
  grading: COLOR_GRADING_OPTIONS,
  lighting: LIGHTING_SETUP_OPTIONS,
  skin: SKIN_RENDERING_OPTIONS,
  dof: DEPTH_OF_FIELD_OPTIONS,
  camera: CAMERA_FORMAT_OPTIONS,
  detail: DETAIL_LEVEL_OPTIONS,
  negative_prompt: NEGATIVE_STYLE_OPTIONS,
} as const;

/** UI labels for each option group */
export const HIRES_OPTION_LABELS: Record<keyof typeof HIRES_OPTION_MAPS, string> = {
  style: 'Photography Style',
  grading: 'Color Grading',
  lighting: 'Lighting Setup',
  skin: 'Skin Rendering',
  dof: 'Depth of Field',
  camera: 'Camera Format',
  detail: 'Detail Level',
  negative_prompt: 'Negative Style',
};

/**
 * Build the assembled hi-res prompt from composable config.
 * Replaces {{tokens}} in the template with prompt fragments from the option maps.
 */
export function buildHiresPrompt(hires: AvatarHiresConfig): string {
  const template = hires.prompt_template;
  if (!template) return '';

  const styleFragment = PHOTOGRAPHY_STYLE_OPTIONS[hires.style] || hires.style;
  const gradingFragment = COLOR_GRADING_OPTIONS[hires.grading] || hires.grading;
  const lightingFragment = LIGHTING_SETUP_OPTIONS[hires.lighting] || hires.lighting;
  const skinFragment = SKIN_RENDERING_OPTIONS[hires.skin] || hires.skin;
  const dofFragment = DEPTH_OF_FIELD_OPTIONS[hires.dof] || hires.dof;
  const cameraFragment = CAMERA_FORMAT_OPTIONS[hires.camera] || hires.camera;
  const detailFragment = DETAIL_LEVEL_OPTIONS[hires.detail] || hires.detail;
  const negativeFragment = NEGATIVE_STYLE_OPTIONS[hires.negative_prompt] || hires.negative_prompt;

  return template
    .replace(/\{\{style\}\}/g, styleFragment)
    .replace(/\{\{grading\}\}/g, gradingFragment)
    .replace(/\{\{lighting\}\}/g, lightingFragment)
    .replace(/\{\{skin\}\}/g, skinFragment)
    .replace(/\{\{dof\}\}/g, dofFragment)
    .replace(/\{\{camera\}\}/g, cameraFragment)
    .replace(/\{\{detail\}\}/g, detailFragment)
    .replace(/\{\{negative_prompt\}\}/g, negativeFragment);
}
