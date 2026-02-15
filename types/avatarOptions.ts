/**
 * Avatar Hi-Res Option Maps & Prompt Builder
 *
 * Composable creative controls for hi-res avatar generation.
 * These controls ENHANCE the draft image's look/feel — they don't
 * change fundamental photography (lighting direction, lens, DoF).
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

export const FILM_EMULATION_OPTIONS: Record<string, string> = {
  'Digital clean': 'clean digital capture with neutral colour science',
  'Kodak Portra 400': 'Kodak Portra 400 film emulation with warm skin tones and soft pastel highlights',
  'Fuji Pro 400H': 'Fuji Pro 400H film emulation with cool greens and muted warmth',
  'Cinematic film': 'cinematic film stock with rich shadows, lifted blacks and filmic grain',
  'Kodachrome': 'Kodachrome film emulation with saturated reds, deep blues and vintage warmth',
};

export const SKIN_RENDERING_OPTIONS: Record<string, string> = {
  'Hyper-realistic': 'natural skin with visible pores, fine vellus hair, subsurface light scattering, authentic skin imperfections and micro-texture variation',
  'Natural': 'natural skin texture with realistic detail and subtle imperfections',
  'Softened editorial': 'softened editorial skin with gentle retouching preserving natural texture',
  'Magazine retouched': 'magazine-grade retouched skin with smooth even complexion',
};

export const RETOUCHING_OPTIONS: Record<string, string> = {
  'Raw': 'minimal post-processing, preserving all natural detail as-shot',
  'Light editorial': 'light editorial retouching with subtle colour correction and sharpening',
  'Full editorial': 'full editorial retouching with colour-corrected tones, dodged highlights and refined details',
  'Beauty': 'beauty-grade retouching with frequency separation, skin smoothing and enhanced definition',
};

export const MOOD_OPTIONS: Record<string, string> = {
  'Clean & polished': 'clean polished atmosphere with crisp detail and professional finish',
  'Warm & intimate': 'warm intimate atmosphere with soft golden tones and gentle contrast',
  'Cool & refined': 'cool refined atmosphere with silvery undertones and elegant restraint',
  'Dramatic & bold': 'dramatic bold atmosphere with deep shadows, strong contrast and cinematic tension',
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
  film: FILM_EMULATION_OPTIONS,
  skin: SKIN_RENDERING_OPTIONS,
  retouching: RETOUCHING_OPTIONS,
  mood: MOOD_OPTIONS,
  detail: DETAIL_LEVEL_OPTIONS,
  negative_prompt: NEGATIVE_STYLE_OPTIONS,
} as const;

/** UI labels for each option group */
export const HIRES_OPTION_LABELS: Record<keyof typeof HIRES_OPTION_MAPS, string> = {
  style: 'Photography Style',
  grading: 'Color Grading',
  film: 'Film Emulation',
  skin: 'Skin Rendering',
  retouching: 'Retouching Level',
  mood: 'Mood & Atmosphere',
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
  const filmFragment = FILM_EMULATION_OPTIONS[hires.film] || hires.film;
  const skinFragment = SKIN_RENDERING_OPTIONS[hires.skin] || hires.skin;
  const retouchingFragment = RETOUCHING_OPTIONS[hires.retouching] || hires.retouching;
  const moodFragment = MOOD_OPTIONS[hires.mood] || hires.mood;
  const detailFragment = DETAIL_LEVEL_OPTIONS[hires.detail] || hires.detail;
  const negativeFragment = NEGATIVE_STYLE_OPTIONS[hires.negative_prompt] || hires.negative_prompt;

  return template
    .replace(/\{\{style\}\}/g, styleFragment)
    .replace(/\{\{grading\}\}/g, gradingFragment)
    .replace(/\{\{film\}\}/g, filmFragment)
    .replace(/\{\{skin\}\}/g, skinFragment)
    .replace(/\{\{retouching\}\}/g, retouchingFragment)
    .replace(/\{\{mood\}\}/g, moodFragment)
    .replace(/\{\{detail\}\}/g, detailFragment)
    .replace(/\{\{negative_prompt\}\}/g, negativeFragment);
}
