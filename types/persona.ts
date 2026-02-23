export type ChallengeStyle =
  | 'socratic'
  | 'devils_advocate'
  | 'steelman'
  | 'empathetic_probe'
  | 'logical_surgeon'
  | 'perspective_shifter';

export type PersonaType = 'challenger' | 'coach' | 'advisor';

export type AdvisoryStyle =
  | 'research_based'
  | 'experiential'
  | 'strategic'
  | 'empathetic'
  | 'practical'
  | 'analytical';

export const ADVISORY_STYLE_LABELS: Record<string, string> = {
  'research_based': 'Research-Based',
  'experiential': 'Experiential',
  'strategic': 'Strategic Thinker',
  'empathetic': 'Empathetic Guide',
  'practical': 'Practical Expert',
  'analytical': 'Analytical Mind',
  // Also map coaching_style values used by advisors
  'expert_advisor': 'Expert Advisor',
  'supportive_guide': 'Supportive Guide',
};

export const ADVISORY_STYLE_DESCRIPTIONS: Record<string, string> = {
  'research_based': 'Evidence-backed expert insights',
  'experiential': 'Wisdom from real-world experience',
  'strategic': 'Strategic frameworks and planning',
  'empathetic': 'Understanding first, advising second',
  'practical': 'Actionable, no-nonsense guidance',
  'analytical': 'Data-driven analysis and logic',
  'expert_advisor': 'Deep expertise and strategic guidance',
  'supportive_guide': 'Supportive, empowering guidance',
};

export interface VoiceConfig {
  provider: 'elevenlabs' | 'playht' | 'azure';
  voiceId: string;
  speed: number;
  pitch: number;
  stability: number;
  similarityBoost?: number;
  style?: number;
}

export interface PersonalityTraits {
  warmth: number;
  directness: number;
  patience: number;
  humor: number;
  formality: number;
}

import { ImageSourcePropType } from 'react-native';
import { CoachingStyle, InteractionMode, FeedbackStyle } from './coaching';

export type AvatarSource = string | ImageSourcePropType;

export interface PersonaDisplay {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: AvatarSource;
  avatarThumbnailUrl: AvatarSource | null;
  challengeStyle: ChallengeStyle;
  specialtyAreas: string[];
  culturalBackground: string | null;
  personality: PersonalityTraits;
  voiceConfig: VoiceConfig;
  // Coaching fields
  personaType: PersonaType;
  domainId: string | null;
  coachingStyle: CoachingStyle | null;
  defaultInteractionMode: InteractionMode;
  feedbackStyle: FeedbackStyle;
  gender: 'male' | 'female';
  advisorCategoryId: string | null;
}

export const CHALLENGE_STYLE_LABELS: Record<ChallengeStyle, string> = {
  socratic: 'Socratic Questioner',
  devils_advocate: "Devil's Advocate",
  steelman: 'Steelman Builder',
  empathetic_probe: 'Empathetic Explorer',
  logical_surgeon: 'Logical Surgeon',
  perspective_shifter: 'Perspective Shifter',
};

export const CHALLENGE_STYLE_DESCRIPTIONS: Record<ChallengeStyle, string> = {
  socratic: 'Uses questions to guide discovery',
  devils_advocate: 'Always challenges your position',
  steelman: 'Strengthens your argument, then finds its limits',
  empathetic_probe: 'Gently explores emotional reasoning',
  logical_surgeon: 'Precisely dissects arguments',
  perspective_shifter: 'Forces viewpoint changes',
};
