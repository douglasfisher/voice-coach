import { useEffect, useMemo, useCallback } from 'react';
import { useAnalysisStore, useAuthStore } from '../stores';
import type {
  GrowthMetrics,
  Level,
  GrowthVelocity,
  FocusArea,
  Milestone,
  UserAchievement,
} from '../types/gamification';
import { getLevelForXP, getXPForNextLevel } from '../lib/gamification';
import {
  calculateGrowthVelocity,
  identifyFocusAreas,
} from '../lib/projections';
import { calculateOverallTrend } from '../lib/analysis';

export function useGrowthMetrics() {
  const user = useAuthStore((s) => s.user);
  const snapshots = useAnalysisStore((s) => s.snapshots);
  const latestSnapshot = useAnalysisStore((s) => s.latestSnapshot);
  const patterns = useAnalysisStore((s) => s.patterns);
  const userProgress = useAnalysisStore((s) => s.userProgress);
  const achievements = useAnalysisStore((s) => s.achievements);
  const allAchievements = useAnalysisStore((s) => s.allAchievements);
  const projections = useAnalysisStore((s) => s.projections);
  const insights = useAnalysisStore((s) => s.insights);
  const isLoading = useAnalysisStore((s) => s.isLoading);
  const error = useAnalysisStore((s) => s.error);
  const fetchGrowthData = useAnalysisStore((s) => s.fetchGrowthData);
  const dismissInsightAction = useAnalysisStore((s) => s.dismissInsight);
  const awardXP = useAnalysisStore((s) => s.awardXP);
  const updateStreak = useAnalysisStore((s) => s.updateStreak);
  const unlockAchievement = useAnalysisStore((s) => s.unlockAchievement);

  // Fetch all growth data on mount
  useEffect(() => {
    if (user?.id) {
      fetchGrowthData(user.id);
    }
  }, [user?.id, fetchGrowthData]);

  // Calculate current scores
  const scores = useMemo(
    () => ({
      overall: latestSnapshot?.overall_score ?? null,
      logical: latestSnapshot?.logical_reasoning_score ?? null,
      biasAwareness: latestSnapshot?.bias_awareness_score ?? null,
      perspective: latestSnapshot?.perspective_taking_score ?? null,
      emotional: latestSnapshot?.emotional_regulation_score ?? null,
    }),
    [latestSnapshot]
  );

  // Calculate level info
  const level: Level = useMemo(() => {
    const xp = userProgress?.current_xp ?? 0;
    return getLevelForXP(xp);
  }, [userProgress]);

  // Calculate XP info
  const xp = useMemo(
    () => ({
      current: userProgress?.current_xp ?? 0,
      forNextLevel: getXPForNextLevel(userProgress?.current_xp ?? 0),
      lifetime: userProgress?.lifetime_xp ?? 0,
    }),
    [userProgress]
  );

  // Calculate streak info
  const streak = useMemo(
    () => ({
      current: userProgress?.current_streak ?? 0,
      longest: userProgress?.longest_streak ?? 0,
      freezeAvailable: (userProgress?.streak_freeze_available ?? 0) > 0,
    }),
    [userProgress]
  );

  // Calculate velocity
  const velocity: GrowthVelocity | null = useMemo(() => {
    if (snapshots.length < 5) return null;
    return calculateGrowthVelocity(snapshots);
  }, [snapshots]);

  // Get projections
  const projectedScore = projections?.projected_30_day ?? null;
  const optimalPotential = projections?.optimal_potential ?? null;
  const limitingFactor = projections?.limiting_factor ?? null;

  // Calculate focus areas
  const focusAreas: FocusArea[] = useMemo(() => {
    return identifyFocusAreas(
      {
        logical: scores.logical,
        biasAwareness: scores.biasAwareness,
        perspective: scores.perspective,
        emotional: scores.emotional,
      },
      patterns
    );
  }, [scores, patterns]);

  // Get recent achievements (last 7 days)
  const recentAchievements: UserAchievement[] = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return achievements.filter(
      (a) => new Date(a.unlocked_at) >= weekAgo
    );
  }, [achievements]);

  // Calculate next milestone
  const nextMilestone: Milestone | null = useMemo(() => {
    // Find the next unearned milestone achievement
    const earnedIds = new Set(achievements.map((a) => a.achievement_id));
    const milestoneAchievements = allAchievements.filter(
      (a) => a.category === 'milestone' && !earnedIds.has(a.id)
    );

    if (milestoneAchievements.length === 0) return null;

    // Get the user's session count
    const sessionCount = userProgress?.lifetime_xp ?? 0;

    const next = milestoneAchievements[0];
    return {
      id: next.id,
      name: next.name,
      description: next.description,
      target: next.requirement_value,
      current: Math.min(sessionCount, next.requirement_value),
      unit: 'sessions',
      completed: false,
      icon: next.icon,
      category: 'sessions',
    };
  }, [achievements, allAchievements, userProgress]);

  // Get current insight (highest priority non-dismissed)
  const currentInsight = insights.length > 0 ? insights[0] : null;

  // Get overall trend
  const trend = useMemo(() => calculateOverallTrend(snapshots), [snapshots]);

  // History for trend graph
  const history = useMemo(
    () =>
      snapshots.map((s) => ({
        date: s.snapshot_date,
        score: s.overall_score,
      })),
    [snapshots]
  );

  // Actions
  const refresh = useCallback(() => {
    if (user?.id) {
      fetchGrowthData(user.id);
    }
  }, [user?.id, fetchGrowthData]);

  const dismissInsight = useCallback(
    (insightId: string) => {
      dismissInsightAction(insightId);
    },
    [dismissInsightAction]
  );

  // Calculate sessions this week
  const sessionsThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return snapshots.filter(
      (s) => new Date(s.snapshot_date) >= weekAgo
    ).length;
  }, [snapshots]);

  // Calculate percentile rank (placeholder - would need global data)
  const percentileRank = useMemo(() => {
    // This would need actual global stats to calculate
    // For now, estimate based on score
    const score = scores.overall ?? 50;
    if (score >= 90) return 95;
    if (score >= 80) return 85;
    if (score >= 70) return 70;
    if (score >= 60) return 55;
    return 40;
  }, [scores.overall]);

  // Compose full metrics object
  const metrics: GrowthMetrics = useMemo(
    () => ({
      scores,
      level,
      xp,
      streak,
      velocity,
      projectedScore,
      optimalPotential,
      limitingFactor: limitingFactor as GrowthMetrics['limitingFactor'],
      achievements,
      recentAchievements,
      nextMilestone,
      focusAreas,
      currentInsight,
      allInsights: insights,
    }),
    [
      scores,
      level,
      xp,
      streak,
      velocity,
      projectedScore,
      optimalPotential,
      limitingFactor,
      achievements,
      recentAchievements,
      nextMilestone,
      focusAreas,
      currentInsight,
      insights,
    ]
  );

  return {
    // Full metrics object
    metrics,

    // Individual properties for convenience
    scores,
    level,
    xp,
    streak,
    velocity,
    projectedScore,
    optimalPotential,
    limitingFactor,
    trend,
    history,

    // Gamification
    achievements,
    allAchievements,
    recentAchievements,
    nextMilestone,
    focusAreas,

    // Engagement stats
    sessionsThisWeek,
    percentileRank,

    // Insights
    currentInsight,
    insights,

    // Projections data
    projections,
    dimensionProjections: projections?.dimension_projections ?? null,

    // State
    isLoading,
    error,

    // Actions
    refresh,
    dismissInsight,
    awardXP: (amount: number, source: string, sourceId?: string) =>
      user?.id ? awardXP(user.id, amount, source, sourceId) : Promise.resolve(0),
    updateStreak: () => (user?.id ? updateStreak(user.id) : Promise.resolve(0)),
    unlockAchievement: (achievementId: string) =>
      user?.id ? unlockAchievement(user.id, achievementId) : Promise.resolve(),
  };
}
