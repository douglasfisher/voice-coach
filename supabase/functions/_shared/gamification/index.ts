/**
 * Gamification Module
 * Exports all gamification functionality
 */

export { processSessionGamification } from './process-session.ts';
export { createOrUpdateSnapshot, getUserSessionCount, getDaysSinceLastSession } from './snapshots.ts';
export { checkAndUnlockAchievements, getStreakMilestone } from './achievements.ts';
export { generateInsights, cleanupOldInsights } from './insights.ts';
export type {
  DimensionScores,
  SessionReport,
  SessionContext,
  GamificationResult,
  Achievement,
  UserProgress,
  InsightInput,
} from './types.ts';
