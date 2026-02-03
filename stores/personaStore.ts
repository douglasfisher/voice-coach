import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Persona } from '../types/database';
import { PersonaDisplay, ChallengeStyle, VoiceConfig } from '../types/persona';

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
