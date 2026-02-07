// Gamification Types for Growth System

// =============================================================================
// XP & LEVELS
// =============================================================================

export interface Level {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  perks?: string[];
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: XPSource;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export type XPSource =
  | 'session_complete'
  | 'daily_first'
  | 'streak_milestone'
  | 'achievement'
  | 'daily_challenge'
  | 'bonus';

// =============================================================================
// USER PROGRESS
// =============================================================================

export interface UserProgress {
  user_id: string;
  current_xp: number;
  current_level: number;
  lifetime_xp: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  streak_freeze_available: number;
  streak_freeze_used_this_week: boolean;
  growth_velocity: number | null;
  velocity_trend: VelocityTrend | null;
  projected_score_30day: number | null;
  optimal_potential_score: number | null;
  created_at: string;
  updated_at: string;
}

export type VelocityTrend = 'accelerating' | 'stable' | 'decelerating';

// =============================================================================
// ACHIEVEMENTS
// =============================================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  requirement_dimension?: string;
  sort_order: number;
  created_at: string;
}

export type AchievementCategory =
  | 'milestone'
  | 'streak'
  | 'score'
  | 'pattern'
  | 'special';

export type AchievementRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  xp_awarded: number;
  achievement?: Achievement;
}

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#6E6E73',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

// =============================================================================
// PROJECTIONS
// =============================================================================

export interface GrowthProjection {
  id: string;
  user_id: string;
  current_overall: number | null;
  current_logical: number | null;
  current_bias_awareness: number | null;
  current_perspective: number | null;
  current_emotional: number | null;
  projected_30_day: number | null;
  optimal_potential: number | null;
  dimension_projections: DimensionProjections | null;
  limiting_factor: LimitingFactor | null;
  confidence_level: number | null;
  valid_until: string;
  created_at: string;
}

export interface DimensionProjections {
  logical: DimensionProjection;
  biasAwareness: DimensionProjection;
  perspective: DimensionProjection;
  emotional: DimensionProjection;
}

export interface DimensionProjection {
  current: number;
  projected: number;
  optimal: number;
}

export type LimitingFactor =
  | 'consistency'
  | 'logical_reasoning'
  | 'bias_awareness'
  | 'perspective_taking'
  | 'emotional_regulation'
  | 'practice_frequency'
  | 'challenge_diversity';

// =============================================================================
// INSIGHTS
// =============================================================================

export interface UserInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  trigger_event: string | null;
  title: string;
  message: string;
  action_type: InsightActionType | null;
  action_data: InsightActionData | null;
  dismissed: boolean;
  read_at: string | null;
  priority: number;
  created_at: string;
  expires_at: string | null;
}

export type InsightType =
  | 'celebration'
  | 'focus'
  | 'recommendation'
  | 'warning'
  | 'milestone';

export type InsightActionType =
  | 'start_session'
  | 'view_achievement'
  | 'try_persona'
  | 'view_pattern'
  | 'complete_challenge';

export interface InsightActionData {
  personaId?: string;
  achievementId?: string;
  patternCode?: string;
  challengeType?: string;
}

// =============================================================================
// FOCUS AREAS
// =============================================================================

export interface FocusArea {
  dimension: GrowthDimension;
  score: number;
  gap: number; // difference from target/optimal
  suggestedPersona?: string;
  priority: 'high' | 'medium' | 'low';
  patterns?: string[]; // related pattern codes
}

export type GrowthDimension =
  | 'logical'
  | 'biasAwareness'
  | 'perspective'
  | 'emotional';

export const DIMENSION_LABELS: Record<GrowthDimension, string> = {
  logical: 'Logical Reasoning',
  biasAwareness: 'Bias Awareness',
  perspective: 'Perspective Taking',
  emotional: 'Emotional Regulation',
};

export const DIMENSION_COLORS: Record<GrowthDimension, string> = {
  logical: '#60a5fa',
  biasAwareness: '#c084fc',
  perspective: '#f472b6',
  emotional: '#4ade80',
};

// =============================================================================
// GROWTH VELOCITY
// =============================================================================

export interface GrowthVelocity {
  overall: number; // points per week
  byDimension: Record<GrowthDimension, number>;
  trend: VelocityTrend;
  weeklyChange: number; // velocity change from last week
}

// =============================================================================
// MILESTONES
// =============================================================================

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  completedAt?: string;
  icon: string;
  category: 'sessions' | 'streak' | 'score' | 'patterns';
}

// =============================================================================
// COMPOSITE TYPES FOR UI
// =============================================================================

export interface GrowthMetrics {
  // Current state
  scores: {
    overall: number | null;
    logical: number | null;
    biasAwareness: number | null;
    perspective: number | null;
    emotional: number | null;
  };

  // Progress
  level: Level;
  xp: {
    current: number;
    forNextLevel: number;
    lifetime: number;
  };

  // Engagement
  streak: {
    current: number;
    longest: number;
    freezeAvailable: boolean;
  };

  // Velocity
  velocity: GrowthVelocity | null;

  // Projections
  projectedScore: number | null;
  optimalPotential: number | null;
  limitingFactor: LimitingFactor | null;

  // Gamification
  achievements: UserAchievement[];
  recentAchievements: UserAchievement[];
  nextMilestone: Milestone | null;

  // Focus
  focusAreas: FocusArea[];

  // Insights
  currentInsight: UserInsight | null;
  allInsights: UserInsight[];
}
