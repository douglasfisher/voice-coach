import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { GrowthSnapshot, UserPattern } from '../types/database';
import type {
  UserProgress,
  UserAchievement,
  Achievement,
  GrowthProjection,
  UserInsight,
  DimensionProjections,
} from '../types/gamification';

interface AnalysisState {
  // Existing state
  patterns: UserPattern[];
  snapshots: GrowthSnapshot[];
  latestSnapshot: GrowthSnapshot | null;
  isLoading: boolean;
  error: string | null;

  // Gamification state
  userProgress: UserProgress | null;
  achievements: UserAchievement[];
  allAchievements: Achievement[];
  projections: GrowthProjection | null;
  insights: UserInsight[];

  // Existing actions
  fetchUserAnalytics: (userId: string) => Promise<void>;
  fetchPatterns: (userId: string) => Promise<void>;
  fetchSnapshots: (userId: string, limit?: number) => Promise<void>;

  // Gamification actions
  fetchUserProgress: (userId: string) => Promise<void>;
  fetchAchievements: (userId: string) => Promise<void>;
  fetchAllAchievements: () => Promise<void>;
  fetchProjections: (userId: string) => Promise<void>;
  fetchInsights: (userId: string) => Promise<void>;
  awardXP: (
    userId: string,
    amount: number,
    source: string,
    sourceId?: string,
    description?: string
  ) => Promise<number>;
  updateStreak: (userId: string) => Promise<number>;
  dismissInsight: (insightId: string) => Promise<void>;
  unlockAchievement: (userId: string, achievementId: string) => Promise<void>;

  // Combined fetch for growth screen
  fetchGrowthData: (userId: string) => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // Initial state
  patterns: [],
  snapshots: [],
  latestSnapshot: null,
  isLoading: false,
  error: null,

  // Gamification initial state
  userProgress: null,
  achievements: [],
  allAchievements: [],
  projections: null,
  insights: [],

  // Existing actions
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

  // Gamification actions
  fetchUserProgress: async (userId) => {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      set({ error: error.message });
      return;
    }

    set({ userProgress: data ?? null });
  },

  fetchAchievements: async (userId) => {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(
        `
        *,
        achievement:achievements(*)
      `
      )
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      set({ error: error.message });
      return;
    }

    // Transform the data to include achievement details
    const achievements: UserAchievement[] = (data ?? []).map((ua) => ({
      id: ua.id,
      user_id: ua.user_id,
      achievement_id: ua.achievement_id,
      unlocked_at: ua.unlocked_at,
      xp_awarded: ua.xp_awarded,
      achievement: ua.achievement,
    }));

    set({ achievements });
  },

  fetchAllAchievements: async () => {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      set({ error: error.message });
      return;
    }

    set({ allAchievements: data ?? [] });
  },

  fetchProjections: async (userId) => {
    const { data, error } = await supabase
      .from('growth_projections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      set({ error: error.message });
      return;
    }

    // Transform dimension_projections from JSON
    if (data) {
      const projection: GrowthProjection = {
        ...data,
        dimension_projections: data.dimension_projections as DimensionProjections | null,
      };
      set({ projections: projection });
    } else {
      set({ projections: null });
    }
  },

  fetchInsights: async (userId) => {
    const { data, error } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      set({ error: error.message });
      return;
    }

    set({ insights: (data ?? []) as UserInsight[] });
  },

  awardXP: async (userId, amount, source, sourceId, description) => {
    // Call the database function
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_amount: amount,
      p_source: source,
      p_source_id: sourceId ?? null,
      p_description: description ?? null,
    });

    if (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }

    // Refresh user progress
    await get().fetchUserProgress(userId);

    return data as number;
  },

  updateStreak: async (userId) => {
    const { data, error } = await supabase.rpc('update_user_streak', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error updating streak:', error);
      throw error;
    }

    // Refresh user progress
    await get().fetchUserProgress(userId);

    return data as number;
  },

  dismissInsight: async (insightId) => {
    const { error } = await supabase
      .from('user_insights')
      .update({ dismissed: true, read_at: new Date().toISOString() })
      .eq('id', insightId);

    if (error) {
      set({ error: error.message });
      return;
    }

    // Remove from local state
    set((state) => ({
      insights: state.insights.filter((i) => i.id !== insightId),
    }));
  },

  unlockAchievement: async (userId, achievementId) => {
    // Get achievement details for XP reward
    const { allAchievements } = get();
    const achievement = allAchievements.find((a) => a.id === achievementId);

    if (!achievement) {
      console.error('Achievement not found:', achievementId);
      return;
    }

    // Check if already unlocked
    const { achievements } = get();
    if (achievements.some((a) => a.achievement_id === achievementId)) {
      console.log('Achievement already unlocked:', achievementId);
      return;
    }

    // Insert user achievement
    const { error } = await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: achievementId,
      xp_awarded: achievement.xp_reward,
    });

    if (error) {
      // Ignore duplicate errors
      if (error.code !== '23505') {
        console.error('Error unlocking achievement:', error);
      }
      return;
    }

    // Award XP for achievement
    await get().awardXP(
      userId,
      achievement.xp_reward,
      'achievement',
      achievementId,
      `Unlocked: ${achievement.name}`
    );

    // Refresh achievements
    await get().fetchAchievements(userId);
  },

  // Combined fetch for growth screen - fetches all data in parallel
  fetchGrowthData: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      await Promise.all([
        get().fetchUserAnalytics(userId),
        get().fetchUserProgress(userId),
        get().fetchAchievements(userId),
        get().fetchAllAchievements(),
        get().fetchProjections(userId),
        get().fetchInsights(userId),
      ]);
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
