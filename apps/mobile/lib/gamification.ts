// Gamification Constants and Utilities

import type { Level, LevelBadgeConfig, AchievementRarity, GrowthDimension } from '../types/gamification';

// =============================================================================
// LEVEL SYSTEM
// =============================================================================

export const LEVELS: Level[] = [
  { level: 1, title: 'Novice Thinker', minXP: 0, maxXP: 499 },
  { level: 2, title: 'Curious Mind', minXP: 500, maxXP: 1499, perks: ['Unlock streak freezes'] },
  { level: 3, title: 'Pattern Seeker', minXP: 1500, maxXP: 3499, perks: ['Access to insights'] },
  { level: 4, title: 'Logic Apprentice', minXP: 3500, maxXP: 6999, perks: ['Detailed analytics'] },
  { level: 5, title: 'Bias Hunter', minXP: 7000, maxXP: 11999, perks: ['Custom challenges'] },
  { level: 6, title: 'Perspective Shifter', minXP: 12000, maxXP: 19999, perks: ['Coach recommendations'] },
  { level: 7, title: 'Emotional Master', minXP: 20000, maxXP: 31999, perks: ['Advanced projections'] },
  { level: 8, title: 'Dialectician', minXP: 32000, maxXP: 49999, perks: ['Expert mode'] },
  { level: 9, title: 'Wisdom Keeper', minXP: 50000, maxXP: 74999, perks: ['All coaches unlocked'] },
  { level: 10, title: 'Master of Reason', minXP: 75000, maxXP: Infinity, perks: ['Legendary status'] },
];

// =============================================================================
// LEVEL BADGES
// =============================================================================

export const LEVEL_BADGES: LevelBadgeConfig[] = [
  { level: 1, icon: 'Sprout', color: '#9CA3AF', glowOpacity: 0 },
  { level: 2, icon: 'Search', color: '#60a5fa', glowOpacity: 0 },
  { level: 3, icon: 'Puzzle', color: '#34d399', glowOpacity: 0 },
  { level: 4, icon: 'BookOpen', color: '#a78bfa', glowOpacity: 0.15 },
  { level: 5, icon: 'Crosshair', color: '#f472b6', glowOpacity: 0.15 },
  { level: 6, icon: 'Eye', color: '#fb923c', glowOpacity: 0.25 },
  { level: 7, icon: 'Heart', color: '#f43f5e', glowOpacity: 0.25 },
  { level: 8, icon: 'Scale', color: '#c084fc', glowOpacity: 0.4 },
  { level: 9, icon: 'Crown', color: '#fbbf24', glowOpacity: 0.4 },
  { level: 10, icon: 'Gem', color: '#fbbf24', glowOpacity: 0.6 },
];

export function getBadgeForLevel(level: number): LevelBadgeConfig {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVEL_BADGES[clamped - 1];
}

export function getLevelForXP(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getXPForNextLevel(currentXP: number): number {
  const currentLevel = getLevelForXP(currentXP);
  if (currentLevel.level >= 10) return 0;
  return LEVELS[currentLevel.level].minXP - currentXP;
}

export function getLevelProgress(currentXP: number): number {
  const level = getLevelForXP(currentXP);
  if (level.level >= 10) return 1;
  const xpInLevel = currentXP - level.minXP;
  const xpNeededForLevel = level.maxXP - level.minXP + 1;
  return xpInLevel / xpNeededForLevel;
}

// =============================================================================
// XP AWARDS
// =============================================================================

export const XP_AWARDS = {
  // Session completion
  SESSION_BASE: 25,
  SESSION_SCORE_MULTIPLIER: 0.5, // score * 0.5 bonus XP

  // Daily bonuses
  FIRST_SESSION_OF_DAY: 50,
  DAILY_CHALLENGE: 75,

  // Streak milestones
  STREAK_3_DAY: 100,
  STREAK_7_DAY: 250,
  STREAK_14_DAY: 500,
  STREAK_30_DAY: 1000,

  // Achievement base rewards (varies by achievement)
  ACHIEVEMENT_BASE: 100,
} as const;

export function calculateSessionXP(score: number, isFirstOfDay: boolean): number {
  let xp = XP_AWARDS.SESSION_BASE + Math.round(score * XP_AWARDS.SESSION_SCORE_MULTIPLIER);
  if (isFirstOfDay) {
    xp += XP_AWARDS.FIRST_SESSION_OF_DAY;
  }
  return xp;
}

export function getStreakMilestoneXP(streak: number): number | null {
  if (streak === 3) return XP_AWARDS.STREAK_3_DAY;
  if (streak === 7) return XP_AWARDS.STREAK_7_DAY;
  if (streak === 14) return XP_AWARDS.STREAK_14_DAY;
  if (streak === 30) return XP_AWARDS.STREAK_30_DAY;
  return null;
}

// =============================================================================
// RARITY COLORS
// =============================================================================

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#6E6E73',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// =============================================================================
// DIMENSION CONFIGURATION
// =============================================================================

export const DIMENSION_CONFIG: Record<
  GrowthDimension,
  {
    label: string;
    shortLabel: string;
    color: string;
    icon: string;
    description: string;
  }
> = {
  logical: {
    label: 'Logical Reasoning',
    shortLabel: 'Logic',
    color: '#60a5fa',
    icon: 'brain',
    description: 'Clear, structured thinking with valid arguments',
  },
  biasAwareness: {
    label: 'Bias Awareness',
    shortLabel: 'Bias Aware',
    color: '#c084fc',
    icon: 'eye',
    description: 'Recognizing and mitigating cognitive biases',
  },
  perspective: {
    label: 'Perspective Taking',
    shortLabel: 'Perspective',
    color: '#f472b6',
    icon: 'lightbulb',
    description: 'Considering multiple viewpoints and alternatives',
  },
  emotional: {
    label: 'Emotional Regulation',
    shortLabel: 'Emotional IQ',
    color: '#4ade80',
    icon: 'heart',
    description: 'Managing emotions in reasoning and communication',
  },
};

// =============================================================================
// STREAK CONFIGURATION
// =============================================================================

export const STREAK_CONFIG = {
  FREEZE_MAX: 2,
  FREEZE_COOLDOWN_DAYS: 7,
  MILESTONES: [3, 7, 14, 30, 60, 100],
} as const;

export function isStreakMilestone(streak: number): boolean {
  return (STREAK_CONFIG.MILESTONES as readonly number[]).includes(streak);
}

// =============================================================================
// PROJECTION CONFIGURATION
// =============================================================================

export const PROJECTION_CONFIG = {
  // Minimum data points needed for projections
  MIN_SNAPSHOTS_FOR_PROJECTION: 5,
  MIN_WEEKS_FOR_VELOCITY: 2,

  // Projection time horizons
  PROJECTION_DAYS: 30,
  OPTIMAL_CALCULATION_DAYS: 90,

  // Confidence thresholds
  HIGH_CONFIDENCE_MIN: 0.7,
  MEDIUM_CONFIDENCE_MIN: 0.4,

  // Growth rate bounds (points per week)
  MAX_GROWTH_RATE: 15,
  MIN_GROWTH_RATE: -10,

  // Ceiling effects
  CEILING_START: 85, // Growth slows after this score
  CEILING_FACTOR: 0.5, // Growth rate multiplier near ceiling
} as const;

// =============================================================================
// INSIGHT CONFIGURATION
// =============================================================================

export const INSIGHT_CONFIG = {
  // Maximum active insights per type
  MAX_ACTIVE_PER_TYPE: 3,

  // Expiry times (in hours)
  CELEBRATION_EXPIRY: 48,
  RECOMMENDATION_EXPIRY: 168, // 1 week
  WARNING_EXPIRY: 72,

  // Priority values
  PRIORITY: {
    URGENT: 100,
    HIGH: 75,
    MEDIUM: 50,
    LOW: 25,
  },
} as const;

// =============================================================================
// ACHIEVEMENT ICONS MAPPING
// =============================================================================

export const ACHIEVEMENT_ICONS: Record<string, string> = {
  footprints: 'footprints',
  rocket: 'rocket',
  'book-open': 'book-open',
  crown: 'crown',
  flame: 'flame',
  zap: 'zap',
  star: 'star',
  trophy: 'trophy',
  brain: 'brain',
  sparkles: 'sparkles',
  award: 'award',
  eye: 'eye',
  lightbulb: 'lightbulb',
  heart: 'heart',
  'rotate-ccw': 'rotate-ccw',
  target: 'target',
  circle: 'circle',
  'refresh-cw': 'refresh-cw',
  users: 'users',
  moon: 'moon',
  sun: 'sun',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

export function formatStreak(days: number): string {
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 100) return '\u{1F525}\u{1F525}\u{1F525}'; // triple fire
  if (streak >= 30) return '\u{1F525}\u{1F525}'; // double fire
  if (streak >= 7) return '\u{1F525}'; // fire
  if (streak >= 3) return '\u{2728}'; // sparkles
  return '';
}

export function getDimensionFromDbField(field: string): GrowthDimension | null {
  const mapping: Record<string, GrowthDimension> = {
    logical_reasoning_score: 'logical',
    bias_awareness_score: 'biasAwareness',
    perspective_taking_score: 'perspective',
    emotional_regulation_score: 'emotional',
  };
  return mapping[field] || null;
}
