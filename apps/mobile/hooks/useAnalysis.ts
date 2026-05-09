import { useEffect } from 'react';
import { useAnalysisStore, useAuthStore } from '../stores';
import { calculateOverallTrend, getRecommendedFocusAreas } from '../lib/analysis';

export function useAnalysis() {
  const user = useAuthStore((s) => s.user);
  const patterns = useAnalysisStore((s) => s.patterns);
  const snapshots = useAnalysisStore((s) => s.snapshots);
  const latestSnapshot = useAnalysisStore((s) => s.latestSnapshot);
  const isLoading = useAnalysisStore((s) => s.isLoading);
  const error = useAnalysisStore((s) => s.error);
  const fetchUserAnalytics = useAnalysisStore((s) => s.fetchUserAnalytics);

  useEffect(() => {
    if (user?.id) {
      fetchUserAnalytics(user.id);
    }
  }, [user?.id, fetchUserAnalytics]);

  const trend = calculateOverallTrend(snapshots);
  const focusAreas = getRecommendedFocusAreas(patterns);

  return {
    patterns,
    snapshots,
    latestSnapshot,
    trend,
    focusAreas,
    isLoading,
    error,
    refresh: () => user?.id && fetchUserAnalytics(user.id),
  };
}

export function useGrowthScores() {
  const latestSnapshot = useAnalysisStore((s) => s.latestSnapshot);
  const snapshots = useAnalysisStore((s) => s.snapshots);

  if (!latestSnapshot) {
    return {
      overall: null,
      logical: null,
      biasAwareness: null,
      perspective: null,
      emotional: null,
      history: [],
    };
  }

  return {
    overall: latestSnapshot.overall_score,
    logical: latestSnapshot.logical_reasoning_score,
    biasAwareness: latestSnapshot.bias_awareness_score,
    perspective: latestSnapshot.perspective_taking_score,
    emotional: latestSnapshot.emotional_regulation_score,
    history: snapshots.map((s) => ({
      date: s.snapshot_date,
      score: s.overall_score,
    })),
  };
}
