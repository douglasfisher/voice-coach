import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Persona } from '../types/database';
import { PersonaDisplay, ChallengeStyle, VoiceConfig, PersonaType } from '../types/persona';
import { CoachingStyle, InteractionMode, FeedbackStyle } from '../types/coaching';
import { resolvePersonaAvatarWithUrl } from '../lib/personaImages';


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
  getAdvisors: () => PersonaDisplay[];
  getAdvisorsByCategory: (categoryId: string) => PersonaDisplay[];
}

function transformPersona(persona: Pick<Persona, 'id' | 'name' | 'tagline' | 'challenge_style' | 'specialty_areas' | 'cultural_background' | 'warmth' | 'directness' | 'patience' | 'humor' | 'formality' | 'voice_provider' | 'voice_id' | 'voice_speed' | 'voice_pitch' | 'voice_stability' | 'persona_type' | 'domain_id' | 'coaching_style' | 'default_interaction_mode' | 'feedback_style' | 'avatar_url' | 'avatar_thumbnail_url' | 'gender'> & { advisor_category_id?: string | null }): PersonaDisplay {
  return {
    id: persona.id,
    name: persona.name,
    tagline: persona.tagline,
    avatarUrl: resolvePersonaAvatarWithUrl(persona.name, persona.avatar_url, persona.avatar_thumbnail_url),
    avatarThumbnailUrl: persona.avatar_thumbnail_url
      ? resolvePersonaAvatarWithUrl(persona.name, persona.avatar_thumbnail_url)
      : null,
    challengeStyle: persona.challenge_style as ChallengeStyle,
    specialtyAreas: persona.specialty_areas ?? [],
    culturalBackground: persona.cultural_background,
    // Personality dimensions are nullable in the DB (set to null
    // before the wizard fills them in). Default to 50/100 — neutral —
    // so consumers never get NaN when computing comparisons.
    personality: {
      warmth: persona.warmth ?? 50,
      directness: persona.directness ?? 50,
      patience: persona.patience ?? 50,
      humor: persona.humor ?? 50,
      formality: persona.formality ?? 50,
    },
    voiceConfig: {
      provider: persona.voice_provider as VoiceConfig['provider'],
      voiceId: persona.voice_id,
      speed: persona.voice_speed ?? 1,
      pitch: persona.voice_pitch ?? 1,
      stability: persona.voice_stability ?? 0.7,
    },
    // Coaching fields
    personaType: (persona.persona_type as PersonaType) || 'challenger',
    domainId: persona.domain_id || null,
    coachingStyle: persona.coaching_style as CoachingStyle | null,
    defaultInteractionMode: (persona.default_interaction_mode as InteractionMode) || 'coach_leads',
    feedbackStyle: (persona.feedback_style as FeedbackStyle) || 'sandwich',
    gender: (persona.gender as 'male' | 'female') || 'male',
    advisorCategoryId: persona.advisor_category_id || null,
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
        .select('id, name, tagline, challenge_style, specialty_areas, cultural_background, warmth, directness, patience, humor, formality, voice_provider, voice_id, voice_speed, voice_pitch, voice_stability, persona_type, domain_id, advisor_category_id, coaching_style, default_interaction_mode, feedback_style, avatar_url, avatar_thumbnail_url, sort_order, gender')
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

  getAdvisors: () => {
    return get().personas.filter((p) => p.personaType === 'advisor');
  },

  getAdvisorsByCategory: (categoryId) => {
    return get().personas.filter(
      (p) => p.personaType === 'advisor' && p.advisorCategoryId === categoryId
    );
  },
}));
