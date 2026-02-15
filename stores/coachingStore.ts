import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  Scenario,
  CoachingDomainDisplay,
  SituationVariant,
  InteractionMode,
} from '../types/coaching';

interface CoachingState {
  // Data
  domains: CoachingDomainDisplay[];
  scenarios: Scenario[];

  // Selection state
  selectedDomain: CoachingDomainDisplay | null;
  selectedScenario: Scenario | null;
  selectedVariant: SituationVariant | null;

  // Loading states
  isLoadingDomains: boolean;
  isLoadingScenarios: boolean;
  error: string | null;

  // Actions
  fetchDomains: () => Promise<void>;
  fetchScenarios: (domainId: string) => Promise<void>;
  fetchAllScenarios: () => Promise<void>;
  selectDomain: (domain: CoachingDomainDisplay | null) => void;
  selectScenario: (scenario: Scenario | null) => void;
  selectVariant: (variant: SituationVariant | null) => void;
  getScenariosByDomain: (domainId: string) => Scenario[];
  getDomainBySlug: (slug: string) => CoachingDomainDisplay | undefined;
  getScenarioBySlug: (domainId: string, slug: string) => Scenario | undefined;
  clearSelection: () => void;
}

function transformDomain(row: Record<string, unknown>): CoachingDomainDisplay {
  return {
    id: row.id as string,
    slug: row.slug as CoachingDomainDisplay['slug'],
    name: row.name as string,
    description: row.description as string | null,
    icon: row.icon as string,
    color: row.color as string,
    tagline: row.tagline as string | null,
    isActive: row.is_active as boolean,
    isPremium: row.is_premium as boolean,
    sortOrder: row.sort_order as number,
  };
}

function transformScenario(row: Record<string, unknown>): Scenario {
  return {
    id: row.id as string,
    domainId: row.domain_id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string | null,
    interactionMode: row.interaction_mode as InteractionMode,
    difficultyLevel: row.difficulty_level as number,
    scenarioContext: row.scenario_context as string,
    userGoal: row.user_goal as string | null,
    situationVariants: (row.situation_variants as SituationVariant[]) || [],
    recommendedCoaches: (row.recommended_coaches as string[]) || [],
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
  };
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
  domains: [],
  scenarios: [],
  selectedDomain: null,
  selectedScenario: null,
  selectedVariant: null,
  isLoadingDomains: false,
  isLoadingScenarios: false,
  error: null,

  fetchDomains: async () => {
    set({ isLoadingDomains: true, error: null });
    try {
      // Fetch domains, scenario counts, and coach counts in parallel
      const [domainsResult, scenarioCountsResult, coachCountsResult] = await Promise.all([
        supabase
          .from('coaching_domains')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('scenarios')
          .select('domain_id')
          .eq('is_active', true),
        supabase
          .from('personas')
          .select('domain_id')
          .eq('is_active', true)
          .eq('persona_type', 'coach'),
      ]);

      if (domainsResult.error) throw domainsResult.error;

      const domains = (domainsResult.data || []).map(transformDomain);

      // Count scenarios per domain
      const countMap = new Map<string, number>();
      for (const s of scenarioCountsResult.data || []) {
        const count = countMap.get(s.domain_id) || 0;
        countMap.set(s.domain_id, count + 1);
      }

      const coachCountMap = new Map<string, number>();
      for (const c of coachCountsResult.data || []) {
        if (c.domain_id) {
          const count = coachCountMap.get(c.domain_id) || 0;
          coachCountMap.set(c.domain_id, count + 1);
        }
      }

      // Merge counts into domains
      const domainsWithCounts: CoachingDomainDisplay[] = domains.map(d => ({
        ...d,
        scenarioCount: countMap.get(d.id) || 0,
        coachCount: coachCountMap.get(d.id) || 0,
      }));

      set({ domains: domainsWithCounts });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingDomains: false });
    }
  },

  fetchScenarios: async (domainId: string) => {
    set({ isLoadingScenarios: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('domain_id', domainId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const scenarios = (data || []).map(transformScenario);

      // Merge with existing scenarios (keep scenarios from other domains)
      const existing = get().scenarios.filter(s => s.domainId !== domainId);
      set({ scenarios: [...existing, ...scenarios] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingScenarios: false });
    }
  },

  fetchAllScenarios: async () => {
    set({ isLoadingScenarios: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const scenarios = (data || []).map(transformScenario);
      set({ scenarios });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingScenarios: false });
    }
  },

  selectDomain: (domain) => {
    set({
      selectedDomain: domain,
      selectedScenario: null,
      selectedVariant: null,
    });
  },

  selectScenario: (scenario) => {
    set({
      selectedScenario: scenario,
      selectedVariant: null,
    });
  },

  selectVariant: (variant) => {
    set({ selectedVariant: variant });
  },

  getScenariosByDomain: (domainId) => {
    return get().scenarios.filter(s => s.domainId === domainId);
  },

  getDomainBySlug: (slug) => {
    return get().domains.find(d => d.slug === slug);
  },

  getScenarioBySlug: (domainId, slug) => {
    return get().scenarios.find(s => s.domainId === domainId && s.slug === slug);
  },

  clearSelection: () => {
    set({
      selectedDomain: null,
      selectedScenario: null,
      selectedVariant: null,
    });
  },
}));
