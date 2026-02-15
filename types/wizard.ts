/**
 * Wizard Types
 *
 * Types for the persona creation wizard and AI avatar generator.
 */

import { PersonaFormData } from './admin';

// =============================================================================
// AVATAR GENERATION
// =============================================================================

export interface AvatarParams {
  ethnicity: string;
  gender: string;
  appearance: string;
  lighting: string;
  clothing: string;
  expression: string;
  accessories: string[];
  pose: string;
  camera: string;
}

export interface DraftImage {
  id: string;
  url: string;
  storagePath: string;
  selected: boolean;
}

export interface AvatarGenerationState {
  params: AvatarParams;
  editablePrompt: string;
  drafts: DraftImage[];
  selectedDraftId: string | null;
  hiResUrl: string | null;
  hiResStoragePath: string | null;
  isGenerating: boolean;
  isUpscaling: boolean;
}

// =============================================================================
// AVATAR LIBRARY
// =============================================================================

export interface AvatarLibraryItem {
  id: string;
  storage_path: string;
  public_url: string;
  prompt: string | null;
  params: AvatarParams | null;
  gender: string | null;
  ethnicity: string | null;
  used_by_persona_id: string | null;
  generation_batch_id: string | null;
  is_hi_res: boolean;
  created_at: string;
}

// =============================================================================
// WIZARD
// =============================================================================

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  0: 'Avatar',
  1: 'Details',
  2: 'Personality',
  3: 'Trait Defaults',
  4: 'Voice',
  5: 'AI Model',
  6: 'System Prompt',
  7: 'Review',
};

export type WizardFormData = PersonaFormData;

// =============================================================================
// AVATAR OPTION PRESETS
// =============================================================================

export const ETHNICITY_OPTIONS = [
  // Americas
  'American',
  'African American',
  'Brazilian',
  'Mexican',
  'Colombian',
  'Indigenous American',
  // Northern Europe
  'English',
  'Irish',
  'Scottish',
  'Scandinavian',
  'Norwegian',
  'Icelandic',
  'German',
  'Dutch',
  // Southern & Eastern Europe
  'Italian',
  'Spanish',
  'Greek',
  'French',
  'Eastern European',
  'Russian',
  // Middle East & North Africa
  'Arab',
  'Turkish',
  'Persian',
  'North African',
  // Sub-Saharan Africa
  'West African',
  'East African',
  'South African',
  // South & East Asia
  'Indian',
  'Japanese',
  'Korean',
  'Chinese',
  'Filipino',
  'Thai',
  'Vietnamese',
  // Oceania
  'Pacific Islander',
  'Australian Aboriginal',
  // Mixed
  'Mixed Heritage',
];

export const GENDER_OPTIONS = ['male', 'female'];

export const APPEARANCE_OPTIONS = [
  'classically attractive',
  'ruggedly handsome',
  'striking features',
  'warm and approachable',
  'youthful and fresh-faced',
  'distinguished and mature',
  'quirky and unique',
  'sharp and angular',
  'soft and gentle',
  'bold and commanding',
  'girl-next-door',
  'boy-next-door',
  'elegant and refined',
  'athletic and toned',
];

export const LIGHTING_OPTIONS = [
  'soft studio',
  'hard studio',
  'classic three point studio lighting',
  'three-point studio lighting with sharp key, fill and rim separation',
  'Rembrandt lighting with butterfly kicker and edge-lit hair light',
  'high-contrast clamshell lighting with specular rim',
  'split lighting with hot hair light and negative fill',
  'butterfly beauty lighting with dual strip softbox rim lights',
  'paramount lighting with wraparound cove fill and backlit hair',
  'broad key with silver bounce fill and focused snoot hair light',
  'large octabox key with gridded strip kickers at 45°',
  'low-key chiaroscuro with single fresnel key and subtle hair kicker',
  'high-key beauty dish with barn-doored background separation lights',
  'tungsten-gelled key with cool-fill contrast and hot backlight',
  'natural window',
  'warm golden hour',
];

export const CLOTHING_OPTIONS = [
  'casual',
  'business casual',
  'formal',
  'athletic',
  'creative/bohemian',
  'streetwear',
];

export const EXPRESSION_OPTIONS = [
  'warm smile',
  'confident smirk',
  'thoughtful gaze',
  'friendly laugh',
  'serene calm',
  'intense focus',
];

export const ACCESSORY_OPTIONS = [
  'glasses',
  'earrings',
  'necklace',
  'headband',
  'scarf',
  'hat',
  'none',
];

export const POSE_OPTIONS = [
  'straight-on',
  'slight angle',
  'three-quarter turn',
  'profile',
];

export const CAMERA_OPTIONS = [
  'Canon 85mm f/1.4',
  'Sony 50mm f/1.2',
  'Nikon 105mm f/2.8',
  'Hasselblad medium format 150mm f2.8',
  'shot on medium format, f/2.8 shallow depth',
  'editorial grade colour science',
  'specular catch lights, magazine-quality retouching',
  'Phase One IQ4 150MP detail'
];

// =============================================================================
// PROMPT SECTIONS
// =============================================================================

export const PROMPT_SECTION_KEYS = [
  'identity',
  'trait_tokens',
  'character_traits',
  'roleplay_behavior',
  'coaching_approach',
] as const;

export type PromptSectionKey = (typeof PROMPT_SECTION_KEYS)[number];

export const PROMPT_SECTION_LABELS: Record<PromptSectionKey, string> = {
  identity: 'Identity & Background',
  trait_tokens: 'Trait Tokens',
  character_traits: 'Character Traits',
  roleplay_behavior: 'Roleplay & Coaching Behavior',
  coaching_approach: 'Coaching Approach',
};
