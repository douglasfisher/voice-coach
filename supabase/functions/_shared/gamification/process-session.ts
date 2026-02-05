/**
 * Session Gamification Processing
 * Main orchestration function for gamification after session completion
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SessionContext, GamificationResult, DimensionScores } from './types.ts';
import { createOrUpdateSnapshot, getUserSessionCount, getDaysSinceLastSession } from './snapshots.ts';
import { checkAndUnlockAchievements, getStreakMilestone } from './achievements.ts';
import { generateInsights, cleanupOldInsights } from './insights.ts';

interface SessionReportInput {
  overall_score: number;
  dimension_scores: DimensionScores;
}

/**
 * Main entry point for gamification processing
 * Called after a session report is saved
 */
export async function processSessionGamification(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  report: SessionReportInput
): Promise<GamificationResult> {
  console.log('Processing gamification for session:', { userId, conversationId, score: report.overall_score });

  const sessionTime = new Date();

  const context: SessionContext = {
    userId,
    conversationId,
    report: {
      tldr: '',
      strengths: [],
      weaknesses: [],
      detailed_analysis: '',
      overall_score: report.overall_score,
      dimension_scores: report.dimension_scores,
      generated_at: sessionTime.toISOString(),
    },
    sessionTime,
  };

  const result: GamificationResult = {
    snapshot: { created: false, date: '' },
    xp: { awarded: 0, newTotal: 0, levelUp: false },
    streak: { current: 0, isNew: false },
    achievements: [],
    insights: [],
  };

  try {
    // 1. Create or update growth snapshot
    const snapshotResult = await createOrUpdateSnapshot(supabase, context);
    result.snapshot = {
      created: snapshotResult.created,
      date: snapshotResult.date,
    };

    // 2. Get session stats for XP and achievements
    const totalSessions = await getUserSessionCount(supabase, userId);
    const daysSinceLastSession = await getDaysSinceLastSession(supabase, userId, conversationId);

    // 3. Calculate and award XP
    const xpResult = await awardSessionXP(
      supabase,
      userId,
      conversationId,
      report.overall_score,
      snapshotResult.isFirstOfDay
    );
    result.xp = xpResult;

    // 4. Update streak
    const streakResult = await updateStreak(supabase, userId);
    result.streak = streakResult;

    // Award streak milestone bonus if applicable
    const streakMilestoneXP = getStreakMilestone(streakResult.current);
    if (streakMilestoneXP && streakResult.isNew) {
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: streakMilestoneXP,
        p_source: 'streak_milestone',
        p_source_id: conversationId,
        p_description: `${streakResult.current}-day streak achieved!`,
      });
      result.xp.awarded += streakMilestoneXP;
      result.streak.milestone = streakResult.current;
    }

    // 5. Check and unlock achievements
    const achievements = await checkAndUnlockAchievements(supabase, {
      userId,
      score: report.overall_score,
      dimensionScores: report.dimension_scores,
      streak: streakResult.current,
      totalSessions,
      sessionTime,
      daysSinceLastSession,
    });
    result.achievements = achievements;

    // 6. Generate insights
    const insights = await generateInsights(supabase, {
      userId,
      score: report.overall_score,
      dimensionScores: report.dimension_scores,
      streak: streakResult.current,
      isStreakMilestone: streakMilestoneXP !== null && streakResult.isNew,
      newAchievements: achievements,
      isFirstOfDay: snapshotResult.isFirstOfDay,
      totalSessions,
    });
    result.insights = insights;

    // 7. Sync to user_profiles for backward compatibility
    await syncUserProfiles(supabase, userId, totalSessions, streakResult.current);

    // 8. Cleanup old insights (async, don't wait)
    cleanupOldInsights(supabase, userId).catch(err => {
      console.warn('Failed to cleanup old insights:', err);
    });

    console.log('Gamification processing complete:', {
      xpAwarded: result.xp.awarded,
      streak: result.streak.current,
      achievementsUnlocked: result.achievements.length,
      insightsGenerated: result.insights.length,
    });

  } catch (error) {
    console.error('Error in gamification processing:', error);
    // Don't throw - gamification failure shouldn't break the report
  }

  return result;
}

/**
 * Award XP for session completion
 */
async function awardSessionXP(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  score: number,
  isFirstOfDay: boolean
): Promise<{ awarded: number; newTotal: number; levelUp: boolean; newLevel?: number }> {
  // Get current level before XP award
  const { data: currentProgress } = await supabase
    .from('user_progress')
    .select('current_level, current_xp')
    .eq('user_id', userId)
    .single();

  const previousLevel = currentProgress?.current_level || 1;

  // Calculate XP
  const baseXP = 25;
  const scoreBonus = Math.round(score * 0.5); // 0-50 bonus based on score
  const firstDayBonus = isFirstOfDay ? 50 : 0;
  const totalXP = baseXP + scoreBonus + firstDayBonus;

  // Award XP using database function
  const { data: newXP, error } = await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_amount: totalXP,
    p_source: 'session_complete',
    p_source_id: conversationId,
    p_description: `Session completed with score ${score}${isFirstOfDay ? ' (first of day bonus!)' : ''}`,
  });

  if (error) {
    console.error('Failed to award XP:', error);
    return { awarded: 0, newTotal: 0, levelUp: false };
  }

  // Get new level
  const { data: newProgress } = await supabase
    .from('user_progress')
    .select('current_level')
    .eq('user_id', userId)
    .single();

  const newLevel = newProgress?.current_level || 1;
  const levelUp = newLevel > previousLevel;

  return {
    awarded: totalXP,
    newTotal: newXP || 0,
    levelUp,
    newLevel: levelUp ? newLevel : undefined,
  };
}

/**
 * Update user streak
 */
async function updateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<{ current: number; isNew: boolean }> {
  // Get previous streak value
  const { data: previousProgress } = await supabase
    .from('user_progress')
    .select('current_streak, last_session_date')
    .eq('user_id', userId)
    .single();

  const previousStreak = previousProgress?.current_streak || 0;
  const previousDate = previousProgress?.last_session_date;

  // Update streak using database function
  const { data: newStreak, error } = await supabase.rpc('update_user_streak', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Failed to update streak:', error);
    return { current: previousStreak, isNew: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const isNew = newStreak > previousStreak && previousDate !== today;

  return {
    current: newStreak || 1,
    isNew,
  };
}

/**
 * Sync gamification data to user_profiles for backward compatibility
 */
async function syncUserProfiles(
  supabase: SupabaseClient,
  userId: string,
  totalSessions: number,
  streak: number
): Promise<void> {
  const { data: progress } = await supabase
    .from('user_progress')
    .select('current_level')
    .eq('user_id', userId)
    .single();

  const { error } = await supabase
    .from('user_profiles')
    .update({
      total_sessions: totalSessions,
      streak_days: streak,
      last_session_at: new Date().toISOString(),
      current_level: progress?.current_level || 1,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to sync user_profiles:', error);
  }
}
