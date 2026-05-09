import { AnalysisResult, AnalysisItemResult, AnalysisItemType } from '../types/analysis';

export function parseAnalysisResponse(response: string): AnalysisResult | null {
  try {
    const parsed = JSON.parse(response);
    return parsed as AnalysisResult;
  } catch {
    console.error('Failed to parse analysis response');
    return null;
  }
}

export function getStrengths(analysis: AnalysisResult): AnalysisItemResult[] {
  return analysis.items.filter((item) => item.type === 'strength');
}

export function getIssues(analysis: AnalysisResult): AnalysisItemResult[] {
  return analysis.items.filter((item) => item.type !== 'strength');
}

export function groupByType(
  items: AnalysisItemResult[]
): Record<AnalysisItemType, AnalysisItemResult[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    },
    {} as Record<AnalysisItemType, AnalysisItemResult[]>
  );
}

export function calculateOverallTrend(
  snapshots: { overall_score: number | null; snapshot_date: string }[]
): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  const validSnapshots = snapshots
    .filter((s) => s.overall_score !== null)
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

  if (validSnapshots.length < 3) {
    return 'insufficient_data';
  }

  const recent = validSnapshots.slice(-3);
  const scores = recent.map((s) => s.overall_score!);

  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const diff = lastScore - firstScore;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

export function getRecommendedFocusAreas(
  patterns: { pattern_type: string; pattern_code: string; occurrence_count: number | null }[]
): { type: string; code: string; priority: 'high' | 'medium' | 'low' }[] {
  // occurrence_count is nullable in the DB; treat null as 0 so the
  // sort is stable rather than NaN.
  const sorted = [...patterns].sort(
    (a, b) => (b.occurrence_count ?? 0) - (a.occurrence_count ?? 0)
  );

  return sorted.slice(0, 5).map((pattern, index) => ({
    type: pattern.pattern_type,
    code: pattern.pattern_code,
    priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
  }));
}
