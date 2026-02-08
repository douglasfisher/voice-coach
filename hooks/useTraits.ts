import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TraitCategory, TraitOption } from '../types/coaching';

export function useTraits(personaType?: 'coach' | 'challenger', userVisibleOnly?: boolean) {
  const [categories, setCategories] = useState<TraitCategory[]>([]);
  const [options, setOptions] = useState<Record<string, TraitOption[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTraits() {
      setIsLoading(true);

      let query = supabase
        .from('trait_categories')
        .select('*')
        .eq('is_active', true);

      if (userVisibleOnly) {
        query = query.eq('user_visible', true);
      }

      const { data: cats } = await query.order('sort_order');

      if (!cats) {
        setIsLoading(false);
        return;
      }

      // Filter by persona type if specified
      const filtered = personaType
        ? cats.filter((c) => c.applies_to?.includes(personaType))
        : cats;

      const mapped: TraitCategory[] = filtered.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        appliesTo: c.applies_to || [],
        sortOrder: c.sort_order,
        userVisible: c.user_visible ?? false,
      }));

      // Fetch all options for these categories
      const categoryIds = mapped.map(c => c.id);
      const { data: opts } = await supabase
        .from('trait_options')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('sort_order');

      const grouped: Record<string, TraitOption[]> = {};
      for (const cat of mapped) {
        grouped[cat.slug] = (opts || [])
          .filter((o) => o.category_id === cat.id)
          .map((o) => ({
            id: o.id,
            categoryId: o.category_id,
            slug: o.slug,
            name: o.name,
            description: o.description,
            promptModifier: o.prompt_modifier,
            isDefault: o.is_default,
            sortOrder: o.sort_order,
          }));
      }

      setCategories(mapped);
      setOptions(grouped);
      setIsLoading(false);
    }

    fetchTraits();
  }, [personaType, userVisibleOnly]);

  return { categories, options, isLoading };
}
