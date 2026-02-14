/**
 * Admin Cost Store
 *
 * Dedicated state management for the AI Cost Center dashboard.
 * Handles budget management, cost metrics, and trend data.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  AIBudget,
  BudgetFormData,
  BudgetProgress,
  CostMetrics,
  CostBreakdown,
  CostTrendPoint,
  CostCenterFilters,
  CostPeriod,
  getPeriodDates,
  getPeriodLabel,
} from '../types/costs';

interface AdminCostState {
  // Data
  metrics: CostMetrics | null;
  budgets: AIBudget[];
  activeBudget: BudgetProgress | null;
  trendData: CostTrendPoint[];
  byModel: CostBreakdown[];
  byPersona: CostBreakdown[];
  byUser: CostBreakdown[];
  byTaskType: CostBreakdown[];

  // Filters
  filters: CostCenterFilters;

  // Loading states
  isLoadingMetrics: boolean;
  isLoadingBudgets: boolean;
  isLoadingTrend: boolean;
  isLoadingBreakdown: boolean;
  isSavingBudget: boolean;

  error: string | null;

  // Actions
  fetchMetrics: () => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchTrendData: (period?: CostPeriod) => Promise<void>;
  fetchBreakdowns: () => Promise<void>;
  createBudget: (data: BudgetFormData) => Promise<{ error: Error | null }>;
  updateBudget: (id: string, data: Partial<BudgetFormData>) => Promise<{ error: Error | null }>;
  deleteBudget: (id: string) => Promise<{ error: Error | null }>;
  setPeriod: (period: CostPeriod) => void;
  refreshAll: () => Promise<void>;
}

export const useAdminCostStore = create<AdminCostState>((set, get) => ({
  // Initial state
  metrics: null,
  budgets: [],
  activeBudget: null,
  trendData: [],
  byModel: [],
  byPersona: [],
  byUser: [],
  byTaskType: [],
  filters: {
    period: '30d',
    groupBy: 'day',
  },
  isLoadingMetrics: false,
  isLoadingBudgets: false,
  isLoadingTrend: false,
  isLoadingBreakdown: false,
  isSavingBudget: false,
  error: null,

  fetchMetrics: async () => {
    set({ isLoadingMetrics: true, error: null });
    try {
      const now = new Date();

      // Calculate period boundaries
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);
      monthStart.setHours(0, 0, 0, 0);

      const lastMonthStart = new Date(now);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 2);
      lastMonthStart.setHours(0, 0, 0, 0);

      const lastMonthEnd = new Date(monthStart);
      lastMonthEnd.setMilliseconds(-1);

      // Fetch usage data for different periods
      const [
        { data: allTimeData },
        { data: monthData },
        { data: lastMonthData },
        { data: weekData },
        { data: todayData },
        { count: totalConversations },
        { count: activeUsers },
      ] = await Promise.all([
        supabase
          .from('ai_usage')
          .select('estimated_cost_cents, total_tokens'),
        supabase
          .from('ai_usage')
          .select('estimated_cost_cents, total_tokens')
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('ai_usage')
          .select('estimated_cost_cents')
          .gte('created_at', lastMonthStart.toISOString())
          .lt('created_at', monthStart.toISOString()),
        supabase
          .from('ai_usage')
          .select('estimated_cost_cents')
          .gte('created_at', weekStart.toISOString()),
        supabase
          .from('ai_usage')
          .select('estimated_cost_cents')
          .gte('created_at', todayStart.toISOString()),
        supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_session_at', monthStart.toISOString()),
      ]);

      const sumCost = (data: { estimated_cost_cents: number }[] | null) =>
        (data || []).reduce((sum, u) => sum + (u.estimated_cost_cents || 0), 0);

      const sumTokens = (data: { total_tokens: number }[] | null) =>
        (data || []).reduce((sum, u) => sum + (u.total_tokens || 0), 0);

      const totalAllTime = sumCost(allTimeData);
      const totalThisMonth = sumCost(monthData);
      const totalLastMonth = sumCost(lastMonthData);
      const totalThisWeek = sumCost(weekData);
      const totalToday = sumCost(todayData);
      const totalTokens = sumTokens(allTimeData);
      const requestCount = allTimeData?.length || 0;

      // Calculate derived metrics
      const monthOverMonthChange =
        totalLastMonth > 0
          ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
          : 0;

      const costPerConversation =
        totalConversations && totalConversations > 0
          ? Math.round(totalAllTime / totalConversations)
          : 0;

      const costPerActiveUser =
        activeUsers && activeUsers > 0
          ? Math.round(totalThisMonth / activeUsers)
          : 0;

      const averageRequestCost =
        requestCount > 0 ? Math.round(totalAllTime / requestCount) : 0;

      const tokensPerDollar =
        totalAllTime > 0 ? Math.round((totalTokens / (totalAllTime / 100))) : 0;

      set({
        metrics: {
          totalAllTime,
          totalThisMonth,
          totalLastMonth,
          totalThisWeek,
          totalToday,
          monthOverMonthChange,
          costPerConversation,
          costPerActiveUser,
          averageRequestCost,
          tokensPerDollar,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingMetrics: false });
    }
  },

  fetchBudgets: async () => {
    set({ isLoadingBudgets: true, error: null });
    try {
      const { data, error } = await supabase
        .from('ai_budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const budgets = data || [];
      set({ budgets });

      // Find active budget and calculate progress
      const activeBudgetData = budgets.find((b) => b.is_active);
      if (activeBudgetData) {
        const percentUsed =
          activeBudgetData.limit_cents > 0
            ? (activeBudgetData.current_spend_cents / activeBudgetData.limit_cents) * 100
            : 0;

        set({
          activeBudget: {
            budget: activeBudgetData,
            percentUsed,
            isWarning: percentUsed >= activeBudgetData.alert_threshold_percent,
            isExceeded: percentUsed >= 100,
            remainingCents: Math.max(
              0,
              activeBudgetData.limit_cents - activeBudgetData.current_spend_cents
            ),
            periodLabel: getPeriodLabel(activeBudgetData.budget_type),
          },
        });
      } else {
        set({ activeBudget: null });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingBudgets: false });
    }
  },

  fetchTrendData: async (period?: CostPeriod) => {
    const currentPeriod = period || get().filters.period;
    set({ isLoadingTrend: true, error: null });

    try {
      const { start, end } = getPeriodDates(currentPeriod);

      // Try to fetch from snapshots first (faster for historical data)
      const { data: snapshots, error: snapshotError } = await supabase
        .from('ai_cost_snapshots')
        .select('snapshot_date, total_cost_cents, total_tokens, total_requests')
        .gte('snapshot_date', start.toISOString().split('T')[0])
        .lte('snapshot_date', end.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (!snapshotError && snapshots && snapshots.length > 0) {
        const trendData: CostTrendPoint[] = snapshots.map((s) => ({
          date: s.snapshot_date,
          costCents: s.total_cost_cents,
          tokens: s.total_tokens,
          requests: s.total_requests,
        }));
        set({ trendData });
      } else {
        // Fallback to raw ai_usage aggregation
        const { data: usageData, error } = await supabase
          .from('ai_usage')
          .select('created_at, estimated_cost_cents, total_tokens')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const dailyMap = new Map<string, CostTrendPoint>();
        (usageData || []).forEach((u) => {
          const date = u.created_at.split('T')[0];
          const existing = dailyMap.get(date) || {
            date,
            costCents: 0,
            tokens: 0,
            requests: 0,
          };
          existing.costCents += u.estimated_cost_cents || 0;
          existing.tokens += u.total_tokens || 0;
          existing.requests += 1;
          dailyMap.set(date, existing);
        });

        set({
          trendData: Array.from(dailyMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingTrend: false });
    }
  },

  fetchBreakdowns: async () => {
    set({ isLoadingBreakdown: true, error: null });

    try {
      const { start, end } = getPeriodDates(get().filters.period);

      const { data: usageData, error } = await supabase
        .from('ai_usage')
        .select(`
          model,
          persona_id,
          user_id,
          task_type,
          estimated_cost_cents,
          total_tokens,
          persona:personas(name)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const usage = usageData || [];
      const totalCost = usage.reduce((sum, u) => sum + (u.estimated_cost_cents || 0), 0);

      // By model
      const modelMap = new Map<string, CostBreakdown>();
      usage.forEach((u) => {
        const existing = modelMap.get(u.model) || {
          id: u.model,
          name: u.model,
          costCents: 0,
          tokens: 0,
          requests: 0,
          percentOfTotal: 0,
        };
        existing.costCents += u.estimated_cost_cents || 0;
        existing.tokens += u.total_tokens || 0;
        existing.requests += 1;
        modelMap.set(u.model, existing);
      });

      const byModel = Array.from(modelMap.values())
        .map((m) => ({
          ...m,
          percentOfTotal: totalCost > 0 ? (m.costCents / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.costCents - a.costCents);

      // By persona
      const personaMap = new Map<string, CostBreakdown>();
      usage.forEach((u) => {
        if (!u.persona_id) return;
        const personaName = (u.persona as unknown as { name: string } | null)?.name || 'Unknown';
        const existing = personaMap.get(u.persona_id) || {
          id: u.persona_id,
          name: personaName,
          costCents: 0,
          tokens: 0,
          requests: 0,
          percentOfTotal: 0,
        };
        existing.costCents += u.estimated_cost_cents || 0;
        existing.tokens += u.total_tokens || 0;
        existing.requests += 1;
        personaMap.set(u.persona_id, existing);
      });

      const byPersona = Array.from(personaMap.values())
        .map((p) => ({
          ...p,
          percentOfTotal: totalCost > 0 ? (p.costCents / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.costCents - a.costCents);

      // By user (top 20)
      const userMap = new Map<string, CostBreakdown>();
      usage.forEach((u) => {
        if (!u.user_id) return;
        const existing = userMap.get(u.user_id) || {
          id: u.user_id,
          name: u.user_id.slice(0, 8),
          costCents: 0,
          tokens: 0,
          requests: 0,
          percentOfTotal: 0,
        };
        existing.costCents += u.estimated_cost_cents || 0;
        existing.tokens += u.total_tokens || 0;
        existing.requests += 1;
        userMap.set(u.user_id, existing);
      });

      // Get user names for top users
      const topUserIds = Array.from(userMap.values())
        .sort((a, b) => b.costCents - a.costCents)
        .slice(0, 20)
        .map((u) => u.id);

      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', topUserIds);

        (profiles || []).forEach((p) => {
          const user = userMap.get(p.id);
          if (user) {
            user.name = p.display_name || user.name;
          }
        });
      }

      const byUser = Array.from(userMap.values())
        .map((u) => ({
          ...u,
          percentOfTotal: totalCost > 0 ? (u.costCents / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.costCents - a.costCents)
        .slice(0, 20);

      // By task type (service breakdown)
      const taskTypeMap = new Map<string, CostBreakdown>();
      const taskTypeLabels: Record<string, string> = {
        chat: 'Chat Messages',
        greeting: 'Greetings',
        report: 'Session Reports',
        analyze: 'Analysis',
        daily_challenge: 'Daily Challenges',
        coaching: 'Coaching',
        feedback: 'Feedback',
        complete: 'Completions',
        unknown: 'Unknown',
      };

      usage.forEach((u) => {
        const taskType = (u as { task_type?: string }).task_type || 'unknown';
        const existing = taskTypeMap.get(taskType) || {
          id: taskType,
          name: taskTypeLabels[taskType] || taskType,
          costCents: 0,
          tokens: 0,
          requests: 0,
          percentOfTotal: 0,
        };
        existing.costCents += u.estimated_cost_cents || 0;
        existing.tokens += u.total_tokens || 0;
        existing.requests += 1;
        taskTypeMap.set(taskType, existing);
      });

      const byTaskType = Array.from(taskTypeMap.values())
        .map((t) => ({
          ...t,
          percentOfTotal: totalCost > 0 ? (t.costCents / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.costCents - a.costCents);

      set({ byModel, byPersona, byUser, byTaskType });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoadingBreakdown: false });
    }
  },

  createBudget: async (data: BudgetFormData) => {
    set({ isSavingBudget: true, error: null });
    try {
      const { error } = await supabase.from('ai_budgets').insert(data);

      if (error) throw error;

      await get().fetchBudgets();
      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSavingBudget: false });
    }
  },

  updateBudget: async (id: string, data: Partial<BudgetFormData>) => {
    set({ isSavingBudget: true, error: null });
    try {
      const { error } = await supabase
        .from('ai_budgets')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await get().fetchBudgets();
      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSavingBudget: false });
    }
  },

  deleteBudget: async (id: string) => {
    set({ isSavingBudget: true, error: null });
    try {
      const { error } = await supabase.from('ai_budgets').delete().eq('id', id);

      if (error) throw error;

      await get().fetchBudgets();
      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSavingBudget: false });
    }
  },

  setPeriod: (period: CostPeriod) => {
    set({ filters: { ...get().filters, period } });
    get().fetchTrendData(period);
    get().fetchBreakdowns();
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchMetrics(),
      get().fetchBudgets(),
      get().fetchTrendData(),
      get().fetchBreakdowns(),
    ]);
  },
}));
