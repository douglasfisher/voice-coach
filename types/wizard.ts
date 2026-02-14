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
  'East Asian',
  'South Asian',
  'Southeast Asian',
  'Middle Eastern',
  'North African',
  'Sub-Saharan African',
  'African American',
  'Northern European',
  'Southern European',
  'Eastern European',
  'Latin American',
  'Indigenous American',
  'Pacific Islander',
  'Mixed Heritage',
];

export const GENDER_OPTIONS = ['male', 'female'];

export const LIGHTING_OPTIONS = [
  'soft studio',
  'dramatic Rembrandt',
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
