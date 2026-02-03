import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Persona } from '../types/database';
import { PersonaDisplay, ChallengeStyle, VoiceConfig } from '../types/persona';

// Dev mode: set to true to use mock data without Supabase
const DEV_MODE = true;

const MOCK_PERSONAS: PersonaDisplay[] = [
  {
    id: '1',
    name: 'Dr. Maya Chen',
    tagline: 'The Empathetic Challenger',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=maya&backgroundColor=fef3c7',
    avatarThumbnailUrl: null,
    challengeStyle: 'empathetic_probe',
    specialtyAreas: ['personal beliefs', 'relationships', 'self-perception'],
    culturalBackground: 'Asian-American, Clinical Psychologist',
    personality: { warmth: 85, directness: 40, patience: 80, humor: 30, formality: 60 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'EXAVITQu4vr4xnSDxMaL', speed: 1, pitch: 1, stability: 0.7 },
  },
  {
    id: '2',
    name: 'Marcus Webb',
    tagline: "The Devil's Advocate",
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=marcus&backgroundColor=ddd6fe',
    avatarThumbnailUrl: null,
    challengeStyle: 'devils_advocate',
    specialtyAreas: ['politics', 'ethics', 'social issues'],
    culturalBackground: 'Black British, Former Barrister',
    personality: { warmth: 45, directness: 90, patience: 40, humor: 60, formality: 50 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'pNInz6obpgDQGcFmaJgB', speed: 1, pitch: 1, stability: 0.5 },
  },
  {
    id: '3',
    name: 'Professor Elena Volkov',
    tagline: 'The Logical Surgeon',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=elena&backgroundColor=fee2e2',
    avatarThumbnailUrl: null,
    challengeStyle: 'logical_surgeon',
    specialtyAreas: ['logic', 'fallacies', 'scientific reasoning'],
    culturalBackground: 'Eastern European, Professor of Logic',
    personality: { warmth: 25, directness: 95, patience: 50, humor: 10, formality: 95 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'MF3mGyEYCl7XYWbV9V6O', speed: 1, pitch: 1, stability: 0.9 },
  },
  {
    id: '4',
    name: 'Kofi Asante',
    tagline: 'The Perspective Shifter',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=kofi&backgroundColor=d1fae5',
    avatarThumbnailUrl: null,
    challengeStyle: 'perspective_shifter',
    specialtyAreas: ['cultural assumptions', 'globalisation', 'identity'],
    culturalBackground: 'Ghanaian, Cultural Anthropologist',
    personality: { warmth: 75, directness: 55, patience: 70, humor: 50, formality: 35 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'TX3LPaxmHKxFdv7VOQHJ', speed: 1, pitch: 1, stability: 0.6 },
  },
  {
    id: '5',
    name: 'Sarah Mitchell',
    tagline: 'The Steelman Builder',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=sarah&backgroundColor=fef9c3',
    avatarThumbnailUrl: null,
    challengeStyle: 'steelman',
    specialtyAreas: ['business decisions', 'practical ethics', 'strategy'],
    culturalBackground: 'American Midwest, Strategy Consultant',
    personality: { warmth: 65, directness: 70, patience: 55, humor: 40, formality: 40 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'ThT5KcBeYPX3keUQqHPh', speed: 1, pitch: 1, stability: 0.7 },
  },
  {
    id: '6',
    name: 'Dr. Raj Patel',
    tagline: 'The Assumption Hunter',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=raj&backgroundColor=e0e7ff',
    avatarThumbnailUrl: null,
    challengeStyle: 'socratic',
    specialtyAreas: ['science', 'medicine', 'epistemology'],
    culturalBackground: 'Indian-British, Physician-Philosopher',
    personality: { warmth: 60, directness: 45, patience: 85, humor: 25, formality: 70 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'ErXwobaYiN019PkySvjV', speed: 1, pitch: 1, stability: 0.8 },
  },
  {
    id: '7',
    name: 'Yuki Tanaka',
    tagline: 'The Uncomfortable Truth',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=yuki&backgroundColor=fce7f3',
    avatarThumbnailUrl: null,
    challengeStyle: 'devils_advocate',
    specialtyAreas: ['gender dynamics', 'tech ethics', 'generational issues'],
    culturalBackground: 'Japanese-American, Tech Ethics Researcher',
    personality: { warmth: 40, directness: 95, patience: 35, humor: 45, formality: 30 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'D38z5RcWu1voky8WS1ja', speed: 1, pitch: 1, stability: 0.6 },
  },
  {
    id: '8',
    name: "Father Thomas O'Brien",
    tagline: 'The Moral Excavator',
    avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=thomas&backgroundColor=ecfccb',
    avatarThumbnailUrl: null,
    challengeStyle: 'socratic',
    specialtyAreas: ['ethics', 'meaning', 'moral foundations'],
    culturalBackground: 'Irish, Former Priest & Ethics Counselor',
    personality: { warmth: 80, directness: 50, patience: 90, humor: 35, formality: 65 },
    voiceConfig: { provider: 'elevenlabs', voiceId: 'onwK4e9ZLuTAKqWW03F9', speed: 1, pitch: 1, stability: 0.8 },
  },
];

interface PersonaState {
  personas: PersonaDisplay[];
  isLoading: boolean;
  error: string | null;

  fetchPersonas: () => Promise<void>;
  getPersonaById: (id: string) => PersonaDisplay | undefined;
  getPersonasByStyle: (style: ChallengeStyle) => PersonaDisplay[];
}

function transformPersona(persona: Persona): PersonaDisplay {
  return {
    id: persona.id,
    name: persona.name,
    tagline: persona.tagline,
    avatarUrl: persona.avatar_url,
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
}));
