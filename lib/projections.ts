// Growth Projections and Velocity Calculations

import type { GrowthSnapshot, UserPattern } from '../types/database';
import type {
  GrowthVelocity,
  GrowthProjection,
  DimensionProjections,
  FocusArea,
  GrowthDimension,
  LimitingFactor,
  VelocityTrend,
} from '../types/gamification';
import { PROJECTION_CONFIG, DIMENSION_CONFIG } from './gamification';

// =============================================================================
// GROWTH VELOCITY CALCULATION
// =============================================================================

interface SnapshotWithScores {
  snapshot_date: string;
  overall_score: number | null;
  logical_reasoning_score: number | null;
  bias_awareness_score: number | null;
  perspective_taking_score: number | null;
  emotional_regulation_score: number | null;
}

export function calculateGrowthVelocity(
  snapshots: SnapshotWithScores[]
): GrowthVelocity | null {
  if (snapshots.length < PROJECTION_CONFIG.MIN_SNAPSHOTS_FOR_PROJECTION) {
    return null;
  }

  // Sort by date ascending
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  // Calculate time span in weeks
  const firstDate = new Date(sorted[0].snapshot_date);
  const lastDate = new Date(sorted[sorted.length - 1].snapshot_date);
  const weekSpan = (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000);

  if (weekSpan < PROJECTION_CONFIG.MIN_WEEKS_FOR_VELOCITY) {
    return null;
  }

  // Calculate overall velocity using linear regression
  const overallVelocity = calculateLinearRegression(
    sorted.map((s, i) => ({ x: i, y: s.overall_score ?? 0 }))
  ) * (sorted.length / weekSpan);

  // Calculate per-dimension velocity
  const byDimension: Record<GrowthDimension, number> = {
    logical: calculateDimensionVelocity(sorted, 'logical_reasoning_score', weekSpan),
    biasAwareness: calculateDimensionVelocity(sorted, 'bias_awareness_score', weekSpan),
    perspective: calculateDimensionVelocity(sorted, 'perspective_taking_score', weekSpan),
    emotional: calculateDimensionVelocity(sorted, 'emotional_regulation_score', weekSpan),
  };

  // Calculate trend by comparing recent velocity to earlier velocity
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstHalfVelocity = calculateLinearRegression(
    firstHalf.map((s, i) => ({ x: i, y: s.overall_score ?? 0 }))
  );
  const secondHalfVelocity = calculateLinearRegression(
    secondHalf.map((s, i) => ({ x: i, y: s.overall_score ?? 0 }))
  );

  const velocityChange = secondHalfVelocity - firstHalfVelocity;

  let trend: VelocityTrend;
  if (velocityChange > 0.5) {
    trend = 'accelerating';
  } else if (velocityChange < -0.5) {
    trend = 'decelerating';
  } else {
    trend = 'stable';
  }

  return {
    overall: Math.round(overallVelocity * 100) / 100,
    byDimension,
    trend,
    weeklyChange: Math.round(velocityChange * 100) / 100,
  };
}

function calculateDimensionVelocity(
  snapshots: SnapshotWithScores[],
  field: keyof SnapshotWithScores,
  weekSpan: number
): number {
  const validSnapshots = snapshots.filter((s) => s[field] !== null);
  if (validSnapshots.length < 2) return 0;

  const slope = calculateLinearRegression(
    validSnapshots.map((s, i) => ({ x: i, y: (s[field] as number) ?? 0 }))
  );

  return Math.round((slope * (validSnapshots.length / weekSpan)) * 100) / 100;
}

function calculateLinearRegression(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0;

  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

// =============================================================================
// POTENTIAL SCORE PROJECTION
// =============================================================================

interface ProjectionInput {
  snapshots: SnapshotWithScores[];
  velocity: GrowthVelocity;
  patterns: UserPattern[];
  consistencyFactor: number; // 0-1, based on session frequency
}

export function projectPotentialScore(input: ProjectionInput): {
  projected30Day: number;
  optimalPotential: number;
  limitingFactor: LimitingFactor;
  confidence: number;
  dimensionProjections: DimensionProjections;
} {
  const { snapshots, velocity, patterns, consistencyFactor } = input;

  if (snapshots.length === 0) {
    return {
      projected30Day: 50,
      optimalPotential: 85,
      limitingFactor: 'practice_frequency',
      confidence: 0.1,
      dimensionProjections: createDefaultDimensionProjections(),
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const currentOverall = latest.overall_score ?? 50;

  // Calculate 30-day projection
  const weeksAhead = PROJECTION_CONFIG.PROJECTION_DAYS / 7;
  let projectedGrowth = velocity.overall * weeksAhead;

  // Apply ceiling effect
  if (currentOverall >= PROJECTION_CONFIG.CEILING_START) {
    const ceilingPenalty =
      (currentOverall - PROJECTION_CONFIG.CEILING_START) /
      (100 - PROJECTION_CONFIG.CEILING_START);
    projectedGrowth *= 1 - ceilingPenalty * (1 - PROJECTION_CONFIG.CEILING_FACTOR);
  }

  // Apply consistency factor
  projectedGrowth *= consistencyFactor;

  // Clamp growth rate
  projectedGrowth = Math.max(
    PROJECTION_CONFIG.MIN_GROWTH_RATE * weeksAhead,
    Math.min(PROJECTION_CONFIG.MAX_GROWTH_RATE * weeksAhead, projectedGrowth)
  );

  const projected30Day = Math.round(
    Math.min(100, Math.max(0, currentOverall + projectedGrowth))
  );

  // Calculate optimal potential (best case with perfect consistency)
  const optimalGrowth =
    Math.max(velocity.overall, 3) * (PROJECTION_CONFIG.OPTIMAL_CALCULATION_DAYS / 7);
  const optimalPotential = Math.round(
    Math.min(100, Math.max(projected30Day, currentOverall + optimalGrowth * 0.7))
  );

  // Identify limiting factor
  const limitingFactor = identifyLimitingFactor(latest, velocity, patterns, consistencyFactor);

  // Calculate confidence
  const confidence = calculateConfidence(snapshots.length, velocity, consistencyFactor);

  // Calculate dimension projections
  const dimensionProjections = calculateDimensionProjections(latest, velocity, weeksAhead);

  return {
    projected30Day,
    optimalPotential,
    limitingFactor,
    confidence,
    dimensionProjections,
  };
}

function createDefaultDimensionProjections(): DimensionProjections {
  return {
    logical: { current: 50, projected: 55, optimal: 80 },
    biasAwareness: { current: 50, projected: 55, optimal: 80 },
    perspective: { current: 50, projected: 55, optimal: 80 },
    emotional: { current: 50, projected: 55, optimal: 80 },
  };
}

function calculateDimensionProjections(
  latest: SnapshotWithScores,
  velocity: GrowthVelocity,
  weeksAhead: number
): DimensionProjections {
  const calcProjection = (
    current: number | null,
    dimensionVelocity: number
  ): { current: number; projected: number; optimal: number } => {
    const curr = current ?? 50;
    const growth = dimensionVelocity * weeksAhead;
    const projected = Math.round(Math.min(100, Math.max(0, curr + growth)));
    const optimal = Math.round(Math.min(100, Math.max(projected, curr + Math.abs(growth) * 3)));
    return { current: curr, projected, optimal };
  };

  return {
    logical: calcProjection(latest.logical_reasoning_score, velocity.byDimension.logical),
    biasAwareness: calcProjection(
      latest.bias_awareness_score,
      velocity.byDimension.biasAwareness
    ),
    perspective: calcProjection(
      latest.perspective_taking_score,
      velocity.byDimension.perspective
    ),
    emotional: calcProjection(latest.emotional_regulation_score, velocity.byDimension.emotional),
  };
}

function identifyLimitingFactor(
  latest: SnapshotWithScores,
  velocity: GrowthVelocity,
  patterns: UserPattern[],
  consistencyFactor: number
): LimitingFactor {
  // Check consistency first
  if (consistencyFactor < 0.5) {
    return 'consistency';
  }

  // Find weakest dimension
  const dimensions: { dimension: LimitingFactor; score: number }[] = [
    {
      dimension: 'logical_reasoning',
      score: latest.logical_reasoning_score ?? 50,
    },
    {
      dimension: 'bias_awareness',
      score: latest.bias_awareness_score ?? 50,
    },
    {
      dimension: 'perspective_taking',
      score: latest.perspective_taking_score ?? 50,
    },
    {
      dimension: 'emotional_regulation',
      score: latest.emotional_regulation_score ?? 50,
    },
  ];

  const weakest = dimensions.reduce((a, b) => (a.score < b.score ? a : b));

  // Check if practice frequency is low based on velocity
  if (velocity.overall < 1) {
    return 'practice_frequency';
  }

  // Check pattern diversity
  const patternTypes = new Set(patterns.map((p) => p.pattern_type));
  if (patterns.length > 10 && patternTypes.size < 3) {
    return 'challenge_diversity';
  }

  return weakest.dimension;
}

function calculateConfidence(
  snapshotCount: number,
  velocity: GrowthVelocity,
  consistencyFactor: number
): number {
  // Base confidence from data quantity
  const dataConfidence = Math.min(1, snapshotCount / 20);

  // Confidence from velocity stability
  const velocityConfidence = velocity.trend === 'stable' ? 0.9 : 0.7;

  // Confidence from consistency
  const consistencyConfidence = consistencyFactor;

  // Weighted average
  const confidence =
    dataConfidence * 0.4 + velocityConfidence * 0.3 + consistencyConfidence * 0.3;

  return Math.round(confidence * 100) / 100;
}

// =============================================================================
// FOCUS AREA IDENTIFICATION
// =============================================================================

export function identifyFocusAreas(
  scores: {
    logical: number | null;
    biasAwareness: number | null;
    perspective: number | null;
    emotional: number | null;
  },
  patterns: UserPattern[],
  targetScore: number = 75
): FocusArea[] {
  const dimensions: {
    dimension: GrowthDimension;
    score: number;
    relatedPatternTypes: string[];
  }[] = [
    {
      dimension: 'logical',
      score: scores.logical ?? 50,
      relatedPatternTypes: ['fallacy'],
    },
    {
      dimension: 'biasAwareness',
      score: scores.biasAwareness ?? 50,
      relatedPatternTypes: ['bias'],
    },
    {
      dimension: 'perspective',
      score: scores.perspective ?? 50,
      relatedPatternTypes: ['perspective'],
    },
    {
      dimension: 'emotional',
      score: scores.emotional ?? 50,
      relatedPatternTypes: ['emotional'],
    },
  ];

  // Calculate gaps and sort by priority
  const focusAreas: FocusArea[] = dimensions
    .map((dim) => {
      const gap = targetScore - dim.score;
      const relatedPatterns = patterns
        .filter((p) => dim.relatedPatternTypes.includes(p.pattern_type))
        .slice(0, 3)
        .map((p) => p.pattern_code);

      // Determine priority based on gap and occurrence
      let priority: 'high' | 'medium' | 'low';
      if (gap >= 25 || relatedPatterns.length >= 3) {
        priority = 'high';
      } else if (gap >= 15 || relatedPatterns.length >= 2) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        dimension: dim.dimension,
        score: dim.score,
        gap: Math.max(0, gap),
        priority,
        patterns: relatedPatterns.length > 0 ? relatedPatterns : undefined,
      };
    })
    .filter((fa) => fa.gap > 0)
    .sort((a, b) => {
      // Sort by priority first, then by gap
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.gap - a.gap;
    });

  return focusAreas;
}

// =============================================================================
// CONSISTENCY CALCULATION
// =============================================================================

export function calculateConsistencyFactor(
  sessionDates: Date[],
  windowDays: number = 28
): number {
  if (sessionDates.length === 0) return 0;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Filter to sessions within window
  const recentSessions = sessionDates.filter((d) => d >= windowStart);

  if (recentSessions.length === 0) return 0;

  // Calculate expected sessions (at least 2 per week = 8 per 28 days)
  const expectedSessions = Math.floor(windowDays / 3.5); // ~2 per week

  // Calculate actual unique days with sessions
  const uniqueDays = new Set(
    recentSessions.map((d) => d.toISOString().split('T')[0])
  ).size;

  // Factor is ratio of actual to expected, capped at 1
  return Math.min(1, uniqueDays / expectedSessions);
}

// =============================================================================
// PERCENTILE RANK
// =============================================================================

export function calculatePercentileRank(
  userScore: number,
  allScores: number[]
): number {
  if (allScores.length === 0) return 50;

  const sorted = [...allScores].sort((a, b) => a - b);
  const belowCount = sorted.filter((s) => s < userScore).length;
  const equalCount = sorted.filter((s) => s === userScore).length;

  return Math.round(((belowCount + equalCount / 2) / sorted.length) * 100);
}
