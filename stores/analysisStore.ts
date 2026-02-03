import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { GrowthSnapshot, UserPattern } from '../types/database';

interface AnalysisState {
  patterns: UserPattern[];
  snapshots: GrowthSnapshot[];
  latestSnapshot: GrowthSnapshot | null;
  isLoading: boolean;
  error: string | null;

  fetchUserAnalytics: (userId: string) => Promise<void>;
  fetchPatterns: (userId: string) => Promise<void>;
  fetchSnapshots: (userId: string, limit?: number) => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  patterns: [],
  snapshots: [],
  latestSnapshot: null,
  isLoading: false,
  error: null,

  fetchUserAnalytics: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const [patternsResult, snapshotsResult] = await Promise.all([
        supabase
          .from('user_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('occurrence_count', { ascending: false }),
        supabase
          .from('growth_snapshots')
          .select('*')
          .eq('user_id', userId)
          .order('snapshot_date', { ascending: false })
          .limit(30),
      ]);

      if (patternsResult.error) throw patternsResult.error;
      if (snapshotsResult.error) throw snapshotsResult.error;

      set({
        patterns: patternsResult.data ?? [],
        snapshots: snapshotsResult.data ?? [],
        latestSnapshot: snapshotsResult.data?.[0] ?? null,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPatterns: async (userId) => {
    const { data, error } = await supabase
      .from('user_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('occurrence_count', { ascending: false });

    if (error) {
      set({ error: error.message });
      return;
    }

    set({ patterns: data ?? [] });
  },

  fetchSnapshots: async (userId, limit = 30) => {
    const { data, error } = await supabase
      .from('growth_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(limit);

    if (error) {
      set({ error: error.message });
      return;
    }

    set({
      snapshots: data ?? [],
      latestSnapshot: data?.[0] ?? null,
    });
  },
}));
