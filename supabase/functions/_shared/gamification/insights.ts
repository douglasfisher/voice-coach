/**
 * Insight Generation
 * Generates contextual insights based on session results
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DimensionScores, InsightInput } from './types.ts';

interface InsightContext {
  userId: string;
  score: number;
  dimensionScores: DimensionScores;
  streak: number;
  isStreakMilestone: boolean;
  newAchievements: { id: string; name: string }[];
  isFirstOfDay: boolean;
  totalSessions: number;
}

interface GeneratedInsight {
  id: string;
  type: string;
  title: string;
}

const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
  logical_reasoning: 'Logical Reasoning',
  bias_awareness: 'Bias Awareness',
  perspective_taking: 'Perspective Taking',
  emotional_regulation: 'Emotional Regulation',
};

/**
 * Find the weakest dimension from scores
 */
function findWeakestDimension(scores: DimensionScores): { key: keyof DimensionScores; label: string; score: number } {
  let weakest: keyof DimensionScores = 'logical_reasoning';
  let lowestScore = scores.logical_reasoning;

  for (const [key, value] of Object.entries(scores) as [keyof DimensionScores, number][]) {
    if (value < lowestScore) {
      lowestScore = value;
      weakest = key;
    }
  }

  return {
    key: weakest,
    label: DIMENSION_LABELS[weakest],
    score: lowestScore,
  };
}

/**
 * Find the strongest dimension from scores
 */
function findStrongestDimension(scores: DimensionScores): { key: keyof DimensionScores; label: string; score: number } {
  let strongest: keyof DimensionScores = 'logical_reasoning';
  let highestScore = scores.logical_reasoning;

  for (const [key, value] of Object.entries(scores) as [keyof DimensionScores, number][]) {
    if (value > highestScore) {
      highestScore = value;
      strongest = key;
    }
  }

  return {
    key: strongest,
    label: DIMENSION_LABELS[strongest],
    score: highestScore,
  };
}

/**
 * Generate insights based on session context
 */
export async function generateInsights(
  supabase: SupabaseClient,
  context: InsightContext
): Promise<GeneratedInsight[]> {
  const { userId, score, dimensionScores, streak, isStreakMilestone, newAchievements, isFirstOfDay, totalSessions } = context;
  const insightsToCreate: InsightInput[] = [];
  const generatedInsights: GeneratedInsight[] = [];

  // Celebration for high score
  if (score >= 90) {
    insightsToCreate.push({
      user_id: userId,
      insight_type: 'celebration',
      trigger_event: 'high_score',
      title: 'Outstanding Session!',
      message: `You scored ${score}! Your critical thinking skills are really shining. Keep up the excellent work!`,
      priority: 100,
    });
  } else if (score >= 80) {
    insightsToCreate.push({
      user_id: userId,
      insight_type: 'celebration',
      trigger_event: 'good_score',
      title: 'Great Progress!',
      message: `Nice work scoring ${score}! You're showing strong engagement with challenging ideas.`,
      priority: 80,
    });
  }

  // Streak milestone celebration
  if (isStreakMilestone && streak > 1) {
    const milestoneMessages: Record<number, string> = {
      3: "You're building a habit! 3 days in a row.",
      7: 'A full week of practice! Your consistency is paying off.',
      14: "Two weeks strong! You're developing real mental discipline.",
      30: 'Monthly mastery achieved! Your dedication is inspiring.',
      100: 'Century streak! You are a true practitioner of critical thinking.',
    };
    const message = milestoneMessages[streak] || `Amazing ${streak}-day streak!`;

    insightsToCreate.push({
      user_id: userId,
      insight_type: 'milestone',
      trigger_event: 'streak_milestone',
      title: `${streak}-Day Streak!`,
      message,
      priority: 95,
    });
  }

  // Achievement celebration (limit to 2 most significant)
  const significantAchievements = newAchievements.slice(0, 2);
  for (const achievement of significantAchievements) {
    insightsToCreate.push({
      user_id: userId,
      insight_type: 'celebration',
      trigger_event: 'achievement_unlocked',
      title: `Achievement Unlocked: ${achievement.name}`,
      message: `Congratulations! You've earned the "${achievement.name}" achievement.`,
      action_type: 'view_achievement',
      action_data: { achievementId: achievement.id },
      priority: 90,
    });
  }

  // Focus recommendation for weak dimension
  const weakestDimension = findWeakestDimension(dimensionScores);
  if (weakestDimension.score < 60) {
    const focusTips: Record<keyof DimensionScores, string> = {
      logical_reasoning: 'Try focusing on structuring your arguments more clearly and examining the evidence behind your claims.',
      bias_awareness: 'Pay attention to assumptions in your thinking. Ask yourself what evidence might contradict your view.',
      perspective_taking: "Practice steel-manning opposing views. What's the strongest version of the argument you disagree with?",
      emotional_regulation: 'When challenged, take a breath before responding. Focus on the ideas, not how they make you feel.',
    };

    insightsToCreate.push({
      user_id: userId,
      insight_type: 'focus',
      trigger_event: 'low_dimension',
      title: `Focus Area: ${weakestDimension.label}`,
      message: `Your ${weakestDimension.label} score was ${weakestDimension.score}. ${focusTips[weakestDimension.key]}`,
      action_type: 'start_session',
      priority: 75,
    });
  }

  // First session welcome
  if (totalSessions === 1) {
    insightsToCreate.push({
      user_id: userId,
      insight_type: 'celebration',
      trigger_event: 'first_session',
      title: 'Welcome to Your Journey!',
      message: "You've completed your first session! Regular practice is the key to developing stronger critical thinking skills.",
      priority: 85,
    });
  }

  // First session of day encouragement
  if (isFirstOfDay && totalSessions > 1 && score < 90) {
    const strongestDimension = findStrongestDimension(dimensionScores);
    insightsToCreate.push({
      user_id: userId,
      insight_type: 'recommendation',
      trigger_event: 'daily_session',
      title: 'Build on Your Strengths',
      message: `Great job maintaining your practice! Your ${strongestDimension.label} (${strongestDimension.score}) is your strongest area today.`,
      priority: 50,
    });
  }

  // Insert all insights
  if (insightsToCreate.length > 0) {
    for (const insight of insightsToCreate) {
      const { data, error } = await supabase
        .from('user_insights')
        .insert(insight)
        .select('id, insight_type, title')
        .single();

      if (error) {
        console.error('Failed to create insight:', error);
      } else if (data) {
        generatedInsights.push({
          id: data.id,
          type: data.insight_type,
          title: data.title,
        });
      }
    }
  }

  return generatedInsights;
}

/**
 * Clear old, dismissed insights (cleanup function)
 */
export async function cleanupOldInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Delete dismissed insights older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await supabase
    .from('user_insights')
    .delete()
    .eq('user_id', userId)
    .eq('dismissed', true)
    .lt('created_at', thirtyDaysAgo.toISOString());

  // Delete expired insights
  await supabase
    .from('user_insights')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString());
}
