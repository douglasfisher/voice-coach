/**
 * Admin Persona Store
 *
 * Full CRUD operations for persona management in the admin panel.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Persona, InsertTables, UpdateTables } from '../types/database';
import { AdminPersonaView, PersonaFormData } from '../types/admin';

interface PersonaTraitDefault {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  optionId: string;
  optionSlug: string;
  optionName: string;
}

interface AdminPersonaState {
  personas: AdminPersonaView[];
  selectedPersona: AdminPersonaView | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  personaTraitDefaults: PersonaTraitDefault[];

  // Actions
  fetchPersonas: () => Promise<void>;
  fetchPersona: (id: string) => Promise<void>;
  createPersona: (data: PersonaFormData) => Promise<{ id: string | null; error: Error | null }>;
  updatePersona: (id: string, data: Partial<Persona>) => Promise<{ error: Error | null }>;
  deletePersona: (id: string) => Promise<{ error: Error | null }>;
  toggleActive: (id: string) => Promise<{ error: Error | null }>;
  toggleEmotionalProgression: (id: string) => Promise<{ error: Error | null }>;
  reorderPersonas: (ids: string[]) => Promise<{ error: Error | null }>;
  clearSelectedPersona: () => void;
  fetchPersonaTraitDefaults: (personaId: string) => Promise<void>;
  updatePersonaTraitDefault: (personaId: string, traitOptionId: string) => Promise<void>;
}

export const useAdminPersonaStore = create<AdminPersonaState>((set, get) => ({
  personas: [],
  selectedPersona: null,
  isLoading: false,
  isSaving: false,
  error: null,
  personaTraitDefaults: [],

  fetchPersonas: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch personas with usage stats
      const { data: personas, error } = await supabase
        .from('personas')
        .select(`
          *,
          conversations:conversations(count),
          messages:conversations(messages(count))
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Transform to include stats
      const personasWithStats: AdminPersonaView[] = (personas || []).map((p) => ({
        ...p,
        conversation_count: p.conversations?.[0]?.count || 0,
        // messages count needs to be aggregated differently
        message_count: 0,
        total_tokens_used: 0,
      }));

      set({ personas: personasWithStats });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPersona: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get usage stats for this persona
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('total_tokens')
        .eq('persona_id', id);

      const totalTokens = (usageData || []).reduce((sum, u) => sum + u.total_tokens, 0);

      const { count: conversationCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('persona_id', id);

      set({
        selectedPersona: {
          ...data,
          conversation_count: conversationCount || 0,
          total_tokens_used: totalTokens,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  createPersona: async (data: PersonaFormData) => {
    set({ isSaving: true, error: null });
    try {
      // Get next sort order
      const { personas } = get();
      const maxSortOrder = Math.max(0, ...personas.map((p) => p.sort_order));

      const insertData: InsertTables<'personas'> = {
        name: data.name,
        tagline: data.tagline,
        avatar_url: data.avatar_url,
        avatar_thumbnail_url: data.avatar_thumbnail_url,
        voice_provider: data.voice_provider,
        voice_id: data.voice_id,
        voice_speed: data.voice_speed,
        voice_pitch: data.voice_pitch,
        voice_stability: data.voice_stability,
        warmth: data.warmth,
        directness: data.directness,
        patience: data.patience,
        humor: data.humor,
        formality: data.formality,
        challenge_style: data.challenge_style,
        specialty_areas: data.specialty_areas,
        cultural_background: data.cultural_background,
        system_prompt: data.system_prompt,
        is_active: data.is_active ?? true,
        is_premium: data.is_premium ?? false,
        sort_order: maxSortOrder + 1,
        ai_config: data.ai_config || {
          model: 'llama-3.1-8b-instant',
          fallback_model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_completion_tokens: 1024,
        },
        prompt_sections: data.prompt_sections || null,
      };

      const { data: newPersona, error } = await supabase
        .from('personas')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await get().fetchPersonas();

      return { id: newPersona.id, error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { id: null, error: error as Error };
    } finally {
      set({ isSaving: false });
    }
  },

  updatePersona: async (id: string, data: Partial<Persona>) => {
    set({ isSaving: true, error: null });
    try {
      const updateData: UpdateTables<'personas'> = { ...data };

      const { error } = await supabase
        .from('personas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const { personas, selectedPersona } = get();
      set({
        personas: personas.map((p) => (p.id === id ? { ...p, ...data } : p)),
        selectedPersona:
          selectedPersona?.id === id
            ? { ...selectedPersona, ...data }
            : selectedPersona,
      });

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSaving: false });
    }
  },

  deletePersona: async (id: string) => {
    set({ isSaving: true, error: null });
    try {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('personas')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const { personas } = get();
      set({
        personas: personas.map((p) =>
          p.id === id ? { ...p, is_active: false } : p
        ),
      });

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSaving: false });
    }
  },

  toggleActive: async (id: string) => {
    const { personas } = get();
    const persona = personas.find((p) => p.id === id);
    if (!persona) return { error: new Error('Persona not found') };

    return get().updatePersona(id, { is_active: !persona.is_active });
  },

  toggleEmotionalProgression: async (id: string) => {
    const { personas } = get();
    const persona = personas.find((p) => p.id === id);
    if (!persona) return { error: new Error('Persona not found') };

    return get().updatePersona(id, {
      emotional_progression_enabled: !persona.emotional_progression_enabled,
    });
  },

  reorderPersonas: async (ids: string[]) => {
    set({ isSaving: true, error: null });
    try {
      // Update sort_order for each persona
      const updates = ids.map((id, index) =>
        supabase
          .from('personas')
          .update({ sort_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      // Update local state
      const { personas } = get();
      const reordered = ids.map((id, index) => {
        const persona = personas.find((p) => p.id === id);
        return persona ? { ...persona, sort_order: index } : null;
      }).filter(Boolean) as AdminPersonaView[];

      set({ personas: reordered });

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSaving: false });
    }
  },

  clearSelectedPersona: () => {
    set({ selectedPersona: null, personaTraitDefaults: [] });
  },

  fetchPersonaTraitDefaults: async (personaId: string) => {
    try {
      const { data, error } = await supabase
        .from('persona_trait_defaults')
        .select(`
          trait_option_id,
          trait_options (
            id, slug, name,
            trait_categories (id, slug, name)
          )
        `)
        .eq('persona_id', personaId);

      if (error) throw error;

      const defaults: PersonaTraitDefault[] = (data || []).map((row) => {
        const opts = row.trait_options;
        const opt = Array.isArray(opts) ? opts[0] : opts;
        const cats = opt?.trait_categories;
        const cat = Array.isArray(cats) ? cats[0] : cats;
        return {
          categoryId: cat?.id,
          categorySlug: cat?.slug,
          categoryName: cat?.name,
          optionId: opt?.id,
          optionSlug: opt?.slug,
          optionName: opt?.name,
        };
      });

      set({ personaTraitDefaults: defaults });
    } catch (error) {
      console.error('Failed to fetch persona trait defaults:', error);
    }
  },

  updatePersonaTraitDefault: async (personaId: string, traitOptionId: string) => {
    try {
      // The DB trigger handles one-per-category constraint (deletes old, inserts new)
      const { error } = await supabase
        .from('persona_trait_defaults')
        .insert({ persona_id: personaId, trait_option_id: traitOptionId });

      if (error) throw error;

      // Refresh defaults
      await get().fetchPersonaTraitDefaults(personaId);
    } catch (error) {
      console.error('Failed to update persona trait default:', error);
      set({ error: (error as Error).message });
    }
  },
}));
