import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Persona } from '../types/database';
import { PersonaDisplay, ChallengeStyle, VoiceConfig, PersonaType } from '../types/persona';
import { CoachingStyle, InteractionMode, FeedbackStyle } from '../types/coaching';

// Dev mode: set to true to use mock data without Supabase
const DEV_MODE = false;

// Local avatar images - mapped by persona name (case-insensitive partial match)
const LOCAL_AVATARS: Record<string, any> = {
  'sarah mitchell': require('../assets/images-1.jpg'),
  'marcus webb': require('../assets/images-2.jpg'),
  "father thomas o'brien": require('../assets/images-3.jpg'),
  'thomas o\'brien': require('../assets/images-3.jpg'),
  'dr. raj patel': require('../assets/images-4.jpg'),
  'raj patel': require('../assets/images-4.jpg'),
  'kofi asante': require('../assets/images-5.jpg'),
  'professor elena volkov': require('../assets/images-7.jpg'),
  'elena volkov': require('../assets/images-7.jpg'),
  'dr. maya chen': require('../assets/images-8.jpg'),
  'maya chen': require('../assets/images-8.jpg'),
  'yuki tanaka': require('../assets/images-8.jpg'), // fallback to same as Maya for now
};

// Get local avatar by persona name
function getLocalAvatar(name: string): any | null {
  const normalizedName = name.toLowerCase().trim();
  return LOCAL_AVATARS[normalizedName] ?? null;
}

const MOCK_PERSONAS: PersonaDisplay[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    tagline: 'The Steelman Builder',
    avatarUrl: LOCAL_AVATARS['sarah mitchell'],
    avatarThumbnailUrl: null,
    challengeStyle: 'steelman',
    specialtyAreas: ['business decisions', 'practical ethics', 'strategy'],
    culturalBackground: 'American Midwest, Strategy Consultant',
    personality: { warmth: 65, directness: 70, patience: 55, humor: 40, formality: 40 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'ThT5KcBeYPX3keUQqHPh', speed: 1, pitch: 1, stability: 0.7 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'sandwich',
  },
  {
    id: '2',
    name: 'Marcus Webb',
    tagline: "The Devil's Advocate",
    avatarUrl: LOCAL_AVATARS['marcus webb'],
    avatarThumbnailUrl: null,
    challengeStyle: 'devils_advocate',
    specialtyAreas: ['politics', 'ethics', 'social issues'],
    culturalBackground: 'Black British, Former Barrister',
    personality: { warmth: 45, directness: 90, patience: 40, humor: 60, formality: 50 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'pNInz6obpgDQGcFmaJgB', speed: 1, pitch: 1, stability: 0.5 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'direct',
  },
  {
    id: '3',
    name: "Father Thomas O'Brien",
    tagline: 'The Moral Excavator',
    avatarUrl: LOCAL_AVATARS["father thomas o'brien"],
    avatarThumbnailUrl: null,
    challengeStyle: 'socratic',
    specialtyAreas: ['ethics', 'meaning', 'moral foundations'],
    culturalBackground: 'Irish, Former Priest & Ethics Counselor',
    personality: { warmth: 80, directness: 50, patience: 90, humor: 35, formality: 65 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'onwK4e9ZLuTAKqWW03F9', speed: 1, pitch: 1, stability: 0.8 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'question_based',
  },
  {
    id: '4',
    name: 'Dr. Raj Patel',
    tagline: 'The Assumption Hunter',
    avatarUrl: LOCAL_AVATARS['dr. raj patel'],
    avatarThumbnailUrl: null,
    challengeStyle: 'socratic',
    specialtyAreas: ['science', 'medicine', 'epistemology'],
    culturalBackground: 'Indian-British, Physician-Philosopher',
    personality: { warmth: 60, directness: 45, patience: 85, humor: 25, formality: 70 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'ErXwobaYiN019PkySvjV', speed: 1, pitch: 1, stability: 0.8 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'question_based',
  },
  {
    id: '5',
    name: 'Kofi Asante',
    tagline: 'The Perspective Shifter',
    avatarUrl: LOCAL_AVATARS['kofi asante'],
    avatarThumbnailUrl: null,
    challengeStyle: 'perspective_shifter',
    specialtyAreas: ['cultural assumptions', 'globalisation', 'identity'],
    culturalBackground: 'Ghanaian, Cultural Anthropologist',
    personality: { warmth: 75, directness: 55, patience: 70, humor: 50, formality: 35 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'TX3LPaxmHKxFdv7VOQHJ', speed: 1, pitch: 1, stability: 0.6 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'observational',
  },
  {
    id: '6',
    name: 'Professor Elena Volkov',
    tagline: 'The Logical Surgeon',
    avatarUrl: LOCAL_AVATARS['professor elena volkov'],
    avatarThumbnailUrl: null,
    challengeStyle: 'logical_surgeon',
    specialtyAreas: ['logic', 'fallacies', 'scientific reasoning'],
    culturalBackground: 'Eastern European, Professor of Logic',
    personality: { warmth: 25, directness: 95, patience: 50, humor: 10, formality: 95 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'MF3mGyEYCl7XYWbV9V6O', speed: 1, pitch: 1, stability: 0.9 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'direct',
  },
  {
    id: '7',
    name: 'Dr. Maya Chen',
    tagline: 'The Empathetic Challenger',
    avatarUrl: LOCAL_AVATARS['dr. maya chen'],
    avatarThumbnailUrl: null,
    challengeStyle: 'empathetic_probe',
    specialtyAreas: ['personal beliefs', 'relationships', 'self-perception'],
    culturalBackground: 'Asian-American, Clinical Psychologist',
    personality: { warmth: 85, directness: 40, patience: 80, humor: 30, formality: 60 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'EXAVITQu4vr4xnSDxMaL', speed: 1, pitch: 1, stability: 0.7 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'sandwich',
  },
  {
    id: '8',
    name: 'Yuki Tanaka',
    tagline: 'The Uncomfortable Truth',
    avatarUrl: LOCAL_AVATARS['yuki tanaka'],
    avatarThumbnailUrl: null,
    challengeStyle: 'devils_advocate',
    specialtyAreas: ['gender dynamics', 'generational issues', 'tech ethics'],
    culturalBackground: 'Japanese-American, Tech Ethics Researcher',
    personality: { warmth: 40, directness: 95, patience: 35, humor: 45, formality: 30 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'D38z5RcWu1voky8WS1ja', speed: 1, pitch: 1, stability: 0.6 },
    personaType: 'challenger',
    domainId: null,
    coachingStyle: null,
    defaultInteractionMode: 'coach_leads',
    feedbackStyle: 'direct',
  },
];

interface PersonaState {
  personas: PersonaDisplay[];
  isLoading: boolean;
  error: string | null;

  fetchPersonas: () => Promise<void>;
  getPersonaById: (id: string) => PersonaDisplay | undefined;
  getPersonasByStyle: (style: ChallengeStyle) => PersonaDisplay[];
  getPersonasByType: (type: PersonaType) => PersonaDisplay[];
  getCoachesByDomain: (domainId: string) => PersonaDisplay[];
  getChallengers: () => PersonaDisplay[];
  getCoaches: () => PersonaDisplay[];
}

function transformPersona(persona: Persona): PersonaDisplay {
  // Use local avatar if available, otherwise fall back to database URL
  const localAvatar = getLocalAvatar(persona.name);

  return {
    id: persona.id,
    name: persona.name,
    tagline: persona.tagline,
    avatarUrl: localAvatar ?? persona.avatar_url,
    avatarThumbnailUrl: persona.avatar_thumbnail_url,
    challengeStyle: persona.challenge_style as ChallengeStyle,
    specialtyAreas: persona.specialty_areas ?? [],
    culturalBackground: persona.cultural_background,
    personality: {
      warmth: persona.warmth,
      directness: persona.directness,
      patience: persona.patience,
      humor: persona.humor,
      formality: persona.formality,
    },
    voiceConfig: {
      provider: persona.voice_provider as VoiceConfig['provider'],
      voiceId: persona.voice_id,
      speed: persona.voice_speed,
      pitch: persona.voice_pitch,
      stability: persona.voice_stability,
    },
    // Coaching fields
    personaType: (persona.persona_type as PersonaType) || 'challenger',
    domainId: persona.domain_id || null,
    coachingStyle: persona.coaching_style as CoachingStyle | null,
    defaultInteractionMode: (persona.default_interaction_mode as InteractionMode) || 'coach_leads',
    feedbackStyle: (persona.feedback_style as FeedbackStyle) || 'sandwich',
  };
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  personas: [],
  isLoading: false,
  error: null,

  fetchPersonas: async () => {
    // Dev mode: use mock data
    if (DEV_MODE) {
      set({ personas: MOCK_PERSONAS, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const personas = (data ?? []).map(transformPersona);
      set({ personas });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  getPersonaById: (id) => {
    return get().personas.find((p) => p.id === id);
  },

  getPersonasByStyle: (style) => {
    return get().personas.filter((p) => p.challengeStyle === style);
  },

  getPersonasByType: (type) => {
    return get().personas.filter((p) => p.personaType === type);
  },

  getCoachesByDomain: (domainId) => {
    return get().personas.filter(
      (p) => p.personaType === 'coach' && p.domainId === domainId
    );
  },

  getChallengers: () => {
    return get().personas.filter((p) => p.personaType === 'challenger');
  },

  getCoaches: () => {
    return get().personas.filter((p) => p.personaType === 'coach');
  },
}));
