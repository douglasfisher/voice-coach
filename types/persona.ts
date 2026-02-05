export type ChallengeStyle =
  | 'socratic'
  | 'devils_advocate'
  | 'steelman'
  | 'empathetic_probe'
  | 'logical_surgeon'
  | 'perspective_shifter';

export type PersonaType = 'challenger' | 'coach';

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
