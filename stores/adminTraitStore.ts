import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AdminTraitCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  appliesTo: string[];
  userVisible: boolean;
  sortOrder: number;
  optionCount: number;
  options: AdminTraitOption[];
}

interface AdminTraitOption {
  id: string;
  slug: string;
  name: string;
  promptModifier: string;
  sortOrder: number;
}

interface AdminTraitState {
  categories: AdminTraitCategory[];
  isLoading: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
  toggleUserVisible: (categoryId: string, visible: boolean) => Promise<void>;
}

export const useAdminTraitStore = create<AdminTraitState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: cats, error } = await supabase
        .from('trait_categories')
        .select('*, trait_options(*)')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const mapped: AdminTraitCategory[] = (cats || []).map((c: any) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        appliesTo: c.applies_to || [],
        userVisible: c.user_visible ?? false,
        sortOrder: c.sort_order,
        optionCount: c.trait_options?.length || 0,
        options: (c.trait_options || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((o: any) => ({
            id: o.id,
            slug: o.slug,
            name: o.name,
            promptModifier: o.prompt_modifier,
            sortOrder: o.sort_order,
          })),
      }));

      set({ categories: mapped });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleUserVisible: async (categoryId: string, visible: boolean) => {
    // Optimistic update so the switch toggles immediately
    const prevCategories = get().categories;
    set({
      categories: prevCategories.map((c) =>
        c.id === categoryId ? { ...c, userVisible: visible } : c
      ),
      error: null,
    });

    try {
      // Use RPC to bypass PostgREST schema cache issues with new columns
      const { error } = await supabase.rpc('toggle_trait_user_visible', {
        p_category_id: categoryId,
        p_visible: visible,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to toggle trait visibility:', error);
      // Revert optimistic update
      set({
        categories: prevCategories,
        error: (error as Error).message,
      });
    }
  },
}));
