/**
 * AI Cost Center Types
 *
 * Types for budget tracking, cost snapshots, and cost center state management.
 */

// =============================================================================
// BUDGET TYPES
// =============================================================================

export type BudgetType = 'daily' | 'weekly' | 'monthly' | 'total';

export interface AIBudget {
  id: string;
  name: string;
  budget_type: BudgetType;
  limit_cents: number;
  alert_threshold_percent: number;
  current_spend_cents: number;
  period_start: string | null;
  period_end: string | null;
  is_active: boolean;
  notify_on_threshold: boolean;
  notify_on_exceeded: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetFormData {
  name: string;
  budget_type: BudgetType;
  limit_cents: number;
  alert_threshold_percent: number;
  is_active: boolean;
  notify_on_threshold: boolean;
  notify_on_exceeded: boolean;
}

export interface BudgetProgress {
  budget: AIBudget;
  percentUsed: number;
  isWarning: boolean;
  isExceeded: boolean;
  remainingCents: number;
  periodLabel: string;
}

// =============================================================================
// COST SNAPSHOT TYPES
// =============================================================================

export interface CostByModel {
  cost_cents: number;
  tokens: number;
  requests: number;
}

export interface CostByEntity {
  cost_cents: number;
  tokens: number;
  requests: number;
}

export interface AICostSnapshot {
  id: string;
  snapshot_date: string;
  total_cost_cents: number;
  total_tokens: number;
  total_requests: number;
  cost_by_model: Record<string, CostByModel>;
  cost_by_persona: Record<string, CostByEntity>;
  cost_by_user: Record<string, CostByEntity>;
  created_at: string;
}

// =============================================================================
// COST METRICS TYPES
// =============================================================================

export interface CostMetrics {
  totalAllTime: number;
  totalThisMonth: number;
  totalLastMonth: number;
  totalThisWeek: number;
  totalToday: number;
  monthOverMonthChange: number;
  costPerConversation: number;
  costPerActiveUser: number;
  averageRequestCost: number;
  tokensPerDollar: number;
}

export interface CostBreakdown {
  id: string;
  name: string;
  costCents: number;
  tokens: number;
  requests: number;
  percentOfTotal: number;
}

export interface CostTrendPoint {
  date: string;
  costCents: number;
  tokens: number;
  requests: number;
}

// =============================================================================
// COST CENTER STATE
// =============================================================================

export type CostPeriod = '7d' | '30d' | '90d' | 'custom';

export interface CostCenterFilters {
  period: CostPeriod;
  startDate?: Date;
  endDate?: Date;
  groupBy: 'day' | 'week' | 'month';
}

export interface CostCenterState {
  // Data
  metrics: CostMetrics | null;
  budgets: AIBudget[];
  activeBudget: BudgetProgress | null;
  trendData: CostTrendPoint[];
  byModel: CostBreakdown[];
  byPersona: CostBreakdown[];
  byUser: CostBreakdown[];

  // Filters
  filters: CostCenterFilters;

  // Loading states
  isLoadingMetrics: boolean;
  isLoadingBudgets: boolean;
  isLoadingTrend: boolean;
  isLoadingBreakdown: boolean;
  isSavingBudget: boolean;

  // Error
  error: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatCostDollars(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

export function formatCostCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return '$' + (dollars / 1000).toFixed(1) + 'K';
  }
  return '$' + dollars.toFixed(2);
}

export function getChangeIndicator(change: number): {
  text: string;
  color: string;
  isPositive: boolean;
} {
  const isPositive = change >= 0;
  const absChange = Math.abs(change);
  return {
    text: (isPositive ? '+' : '-') + absChange.toFixed(1) + '%',
    color: isPositive ? '#ef4444' : '#10b981', // Red for increase (cost), green for decrease
    isPositive,
  };
}

export function getBudgetStatusColor(percentUsed: number): string {
  if (percentUsed >= 100) return '#ef4444'; // Red - exceeded
  if (percentUsed >= 90) return '#f97316'; // Orange - critical
  if (percentUsed >= 80) return '#f59e0b'; // Amber - warning
  return '#10b981'; // Green - healthy
}

export function getPeriodLabel(budgetType: BudgetType): string {
  switch (budgetType) {
    case 'daily':
      return 'Today';
    case 'weekly':
      return 'This Week';
    case 'monthly':
      return 'This Month';
    case 'total':
      return 'All Time';
  }
}

export function getPeriodDates(period: CostPeriod): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'custom':
      // Custom dates should be set separately
      start.setDate(start.getDate() - 30);
      break;
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}
