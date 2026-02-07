/**
 * Achievement System
 * Checks and unlocks achievements based on session data
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Achievement, DimensionScores } from './types.ts';

interface AchievementContext {
  userId: string;
  score: number;
  dimensionScores: DimensionScores;
  streak: number;
  totalSessions: number;
  sessionTime: Date;
  daysSinceLastSession: number | null;
}

interface UnlockedAchievement {
  id: string;
  name: string;
  xpReward: number;
}

/**
 * Check and unlock achievements based on session context
 */
export async function checkAndUnlockAchievements(
  supabase: SupabaseClient,
  context: AchievementContext
): Promise<UnlockedAchievement[]> {
  const { userId } = context;
  const unlocked: UnlockedAchievement[] = [];

  // Fetch already unlocked achievement IDs
  const { data: existingAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedIds = new Set(existingAchievements?.map(a => a.achievement_id) || []);

  // Fetch all achievement definitions
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('*');

  if (achievementsError || !achievements) {
    console.error('Failed to fetch achievements:', achievementsError);
    return [];
  }

  // Check each achievement
  for (const achievement of achievements as Achievement[]) {
    if (unlockedIds.has(achievement.id)) {
      continue; // Already unlocked
    }

    if (checkAchievementCriteria(achievement, context)) {
      const result = await unlockAchievement(supabase, userId, achievement);
      if (result) {
        unlocked.push(result);
      }
    }
  }

  return unlocked;
}

/**
 * Check if achievement criteria is met
 */
function checkAchievementCriteria(
  achievement: Achievement,
  context: AchievementContext
): boolean {
  const { score, dimensionScores, streak, totalSessions, sessionTime, daysSinceLastSession } = context;

  switch (achievement.requirement_type) {
    case 'sessions_completed':
      return totalSessions >= achievement.requirement_value;

    case 'streak_days':
      return streak >= achievement.requirement_value;

    case 'score_threshold':
      return score >= achievement.requirement_value;

    case 'dimension_max':
      // Check if any dimension score hits the requirement
      if (achievement.id === 'logic_master') {
        return dimensionScores.logical_reasoning >= achievement.requirement_value;
      }
      if (achievement.id === 'bias_buster') {
        return dimensionScores.bias_awareness >= achievement.requirement_value;
      }
      if (achievement.id === 'perspective_pro') {
        return dimensionScores.perspective_taking >= achievement.requirement_value;
      }
      if (achievement.id === 'emotional_expert') {
        return dimensionScores.emotional_regulation >= achievement.requirement_value;
      }
      return false;

    case 'all_dimensions_above':
      // All 4 dimensions must be above threshold
      return (
        dimensionScores.logical_reasoning >= achievement.requirement_value &&
        dimensionScores.bias_awareness >= achievement.requirement_value &&
        dimensionScores.perspective_taking >= achievement.requirement_value &&
        dimensionScores.emotional_regulation >= achievement.requirement_value
      );

    case 'comeback_days':
      // Return after 7+ days away
      return daysSinceLastSession !== null && daysSinceLastSession >= achievement.requirement_value;

    case 'night_session':
      // Session completed between 10 PM and 4 AM
      const nightHour = sessionTime.getHours();
      return nightHour >= 22 || nightHour < 4;

    case 'morning_session':
      // Session completed between 5 AM and 7 AM
      const morningHour = sessionTime.getHours();
      return morningHour >= 5 && morningHour < 7;

    case 'pattern_improved':
    case 'patterns_improved':
    case 'all_personas':
      // These require additional context not available in single session
      // Will be handled separately
      return false;

    default:
      console.warn(`Unknown achievement requirement type: ${achievement.requirement_type}`);
      return false;
  }
}

/**
 * Unlock an achievement for the user
 */
async function unlockAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievement: Achievement
): Promise<UnlockedAchievement | null> {
  const { error: insertError } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievement.id,
      xp_awarded: achievement.xp_reward,
    });

  if (insertError) {
    // Could be duplicate (race condition) or other error
    if (insertError.code === '23505') {
      // Unique constraint violation - already unlocked
      return null;
    }
    console.error('Failed to unlock achievement:', insertError);
    return null;
  }

  // Award XP for the achievement
  await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_amount: achievement.xp_reward,
    p_source: 'achievement',
    p_source_id: achievement.id,
    p_description: `Achievement unlocked: ${achievement.name}`,
  });

  console.log(`Achievement unlocked: ${achievement.name} for user ${userId}`);

  return {
    id: achievement.id,
    name: achievement.name,
    xpReward: achievement.xp_reward,
  };
}

/**
 * Check streak milestone achievements
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones: Record<number, number> = {
    3: 100,
    7: 250,
    14: 500,
    30: 1000,
    100: 2500,
  };
  return milestones[streak] || null;
}
