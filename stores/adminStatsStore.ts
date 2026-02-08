/**
 * Admin Stats Store
 *
 * Usage statistics, cost tracking, and app settings management.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AppSettings } from '../types/database';
import {
  DashboardStats,
  UsageSummary,
  UsageStats,
  UsageByModel,
  UsageByPersona,
  UsageByUser,
  DailyUsage,
  DateRange,
  DateRangePreset,
  getDateRangeFromPreset,
  AppSettingsMap,
} from '../types/admin';

interface AdminStatsState {
  // Dashboard
  dashboardStats: DashboardStats | null;

  // Usage
  usageSummary: UsageSummary | null;
  dateRange: DateRange;

  // Settings
  settings: Partial<AppSettingsMap>;
  settingsRaw: AppSettings[];

  // Loading states
  isLoadingDashboard: boolean;
  isLoadingUsage: boolean;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  isUpdatingModel: boolean;

  error: string | null;

  // Actions
  fetchDashboardStats: () => Promise<void>;
  fetchUsageSummary: (dateRange?: DateRange) => Promise<void>;
  setDateRange: (preset: DateRangePreset) => void;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettingsMap>(
    key: K,
    value: AppSettingsMap[K]
  ) => Promise<{ error: Error | null }>;
  updateModelPricing: (
    modelId: string,
    costPerMillionInput: number,
    costPerMillionOutput: number
  ) => Promise<{ error: Error | null }>;
}

export const useAdminStatsStore = create<AdminStatsState>((set, get) => ({
  dashboardStats: null,
  usageSummary: null,
  dateRange: getDateRangeFromPreset('month'),
  settings: {},
  settingsRaw: [],
  isLoadingDashboard: false,
  isLoadingUsage: false,
  isLoadingSettings: false,
  isSavingSettings: false,
  isUpdatingModel: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoadingDashboard: true, error: null });
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);

      // Fetch counts in parallel
      const [
        { count: totalUsers },
        { count: activeToday },
        { count: activeWeek },
        { count: activeMonth },
        { count: totalConversations },
        { count: activePersonas },
        { data: usageToday },
        { data: usageWeek },
        { data: usageMonth },
      ] = await Promise.all([
        // Total users
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true }),
        // Active today
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_session_at', todayStart.toISOString()),
        // Active this week
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_session_at', weekStart.toISOString()),
        // Active this month
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_session_at', monthStart.toISOString()),
        // Total conversations
        supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true }),
        // Active personas
        supabase
          .from('personas')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        // Usage today
        supabase
          .from('ai_usage')
          .select('total_tokens, estimated_cost_cents')
          .gte('created_at', todayStart.toISOString()),
        // Usage week
        supabase
          .from('ai_usage')
          .select('total_tokens, estimated_cost_cents')
          .gte('created_at', weekStart.toISOString()),
        // Usage month
        supabase
          .from('ai_usage')
          .select('total_tokens, estimated_cost_cents')
          .gte('created_at', monthStart.toISOString()),
      ]);

      const sumUsage = (data: { total_tokens: number; estimated_cost_cents: number }[] | null) => ({
        tokens: (data || []).reduce((sum, u) => sum + u.total_tokens, 0),
        cost: (data || []).reduce((sum, u) => sum + u.estimated_cost_cents, 0),
      });

      const todayUsage = sumUsage(usageToday);
      const weekUsage = sumUsage(usageWeek);
      const monthUsage = sumUsage(usageMonth);

      set({
        dashboardStats: {
          totalUsers: totalUsers || 0,
          activeUsersToday: activeToday || 0,
          activeUsersWeek: activeWeek || 0,
          activeUsersMonth: activeMonth || 0,
          totalConversations: totalConversations || 0,
          activePersonas: activePersonas || 0,
          tokensToday: todayUsage.tokens,
          tokensWeek: weekUsage.tokens,
          tokensMonth: monthUsage.tokens,
          costToday: todayUsage.cost,
          costWeek: weekUsage.cost,
          costMonth: monthUsage.cost,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingDashboard: false });
    }
  },

  fetchUsageSummary: async (dateRange?: DateRange) => {
    const range = dateRange || get().dateRange;
    set({ isLoadingUsage: true, error: null, dateRange: range });

    try {
      const { start, end } = range;

      // Fetch all usage data in the range
      const { data: usageData, error } = await supabase
        .from('ai_usage')
        .select(`
          *,
          persona:personas(name)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usage = usageData || [];

      // Calculate stats
      const calculateStats = (data: typeof usage): UsageStats => ({
        totalTokens: data.reduce((sum, u) => sum + u.total_tokens, 0),
        totalCostCents: data.reduce((sum, u) => sum + u.estimated_cost_cents, 0),
        promptTokens: data.reduce((sum, u) => sum + u.prompt_tokens, 0),
        completionTokens: data.reduce((sum, u) => sum + u.completion_tokens, 0),
        requestCount: data.length,
      });

      // Time-based filters
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);

      const today = usage.filter((u) => new Date(u.created_at) >= todayStart);
      const week = usage.filter((u) => new Date(u.created_at) >= weekStart);
      const month = usage.filter((u) => new Date(u.created_at) >= monthStart);

      // By model
      const modelMap = new Map<string, UsageByModel>();
      usage.forEach((u) => {
        const existing = modelMap.get(u.model) || {
          model: u.model,
          tokens: 0,
          costCents: 0,
          requestCount: 0,
        };
        existing.tokens += u.total_tokens;
        existing.costCents += u.estimated_cost_cents;
        existing.requestCount += 1;
        modelMap.set(u.model, existing);
      });

      // By persona
      const personaMap = new Map<string, UsageByPersona>();
      usage.forEach((u) => {
        if (!u.persona_id) return;
        const existing = personaMap.get(u.persona_id) || {
          personaId: u.persona_id,
          personaName: (u.persona as unknown as { name: string } | null)?.name || 'Unknown',
          tokens: 0,
          costCents: 0,
          requestCount: 0,
        };
        existing.tokens += u.total_tokens;
        existing.costCents += u.estimated_cost_cents;
        existing.requestCount += 1;
        personaMap.set(u.persona_id, existing);
      });

      // Top users
      const userMap = new Map<string, UsageByUser>();
      usage.forEach((u) => {
        if (!u.user_id) return;
        const existing = userMap.get(u.user_id) || {
          userId: u.user_id,
          userName: u.user_id.slice(0, 8), // Will be enriched with names
          tokens: 0,
          costCents: 0,
          requestCount: 0,
        };
        existing.tokens += u.total_tokens;
        existing.costCents += u.estimated_cost_cents;
        existing.requestCount += 1;
        userMap.set(u.user_id, existing);
      });

      // Get user names for top users
      const topUserIds = Array.from(userMap.values())
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10)
        .map((u) => u.userId);

      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', topUserIds);

        (profiles || []).forEach((p) => {
          const user = userMap.get(p.id);
          if (user) {
            user.userName = p.display_name || user.userName;
          }
        });
      }

      // Daily trend
      const dailyMap = new Map<string, DailyUsage>();
      usage.forEach((u) => {
        const date = u.created_at.split('T')[0];
        const existing = dailyMap.get(date) || {
          date,
          tokens: 0,
          costCents: 0,
          requestCount: 0,
        };
        existing.tokens += u.total_tokens;
        existing.costCents += u.estimated_cost_cents;
        existing.requestCount += 1;
        dailyMap.set(date, existing);
      });

      set({
        usageSummary: {
          today: calculateStats(today),
          week: calculateStats(week),
          month: calculateStats(month),
          allTime: calculateStats(usage),
          byModel: Array.from(modelMap.values()).sort((a, b) => b.tokens - a.tokens),
          byPersona: Array.from(personaMap.values()).sort((a, b) => b.tokens - a.tokens),
          topUsers: Array.from(userMap.values())
            .sort((a, b) => b.tokens - a.tokens)
            .slice(0, 10),
          dailyTrend: Array.from(dailyMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingUsage: false });
    }
  },

  setDateRange: (preset: DateRangePreset) => {
    const dateRange = getDateRangeFromPreset(preset);
    get().fetchUsageSummary(dateRange);
  },

  fetchSettings: async () => {
    set({ isLoadingSettings: true, error: null });
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;

      const settingsRaw = data || [];
      const settings: Partial<AppSettingsMap> = {};

      settingsRaw.forEach((s) => {
        try {
          (settings as Record<string, unknown>)[s.key] = typeof s.value === 'string'
            ? JSON.parse(s.value)
            : s.value;
        } catch {
          (settings as Record<string, unknown>)[s.key] = s.value;
        }
      });

      set({ settings, settingsRaw });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingSettings: false });
    }
  },

  updateSetting: async <K extends keyof AppSettingsMap>(
    key: K,
    value: AppSettingsMap[K]
  ) => {
    set({ isSavingSettings: true, error: null });
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: JSON.stringify(value) })
        .eq('key', key);

      if (error) throw error;

      // Update local state
      set((state) => ({
        settings: { ...state.settings, [key]: value },
      }));

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSavingSettings: false });
    }
  },

  updateModelPricing: async (
    modelId: string,
    costPerMillionInput: number,
    costPerMillionOutput: number
  ) => {
    set({ isUpdatingModel: true, error: null });
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({
          cost_per_million_input: costPerMillionInput,
          cost_per_million_output: costPerMillionOutput,
          updated_at: new Date().toISOString(),
        })
        .eq('id', modelId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isUpdatingModel: false });
    }
  },
}));
