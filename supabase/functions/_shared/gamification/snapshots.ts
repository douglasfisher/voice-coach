/**
 * Growth Snapshots
 * Creates and updates daily growth snapshots with dimension scores
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SessionContext } from './types.ts';

interface SnapshotResult {
  created: boolean;
  date: string;
  isFirstOfDay: boolean;
}

/**
 * Creates or updates a growth snapshot for the session date
 * If a snapshot already exists for today, it averages the scores
 */
export async function createOrUpdateSnapshot(
  supabase: SupabaseClient,
  context: SessionContext
): Promise<SnapshotResult> {
  const { userId, conversationId, report } = context;
  const today = new Date().toISOString().split('T')[0];

  // Check if snapshot exists for today
  const { data: existing } = await supabase
    .from('growth_snapshots')
    .select('id, overall_score, logical_reasoning_score, bias_awareness_score, perspective_taking_score, emotional_regulation_score, metrics_breakdown')
    .eq('user_id', userId)
    .eq('snapshot_date', today)
    .single();

  const isFirstOfDay = !existing;

  if (existing) {
    // Average with existing scores
    const sessionCount = (existing.metrics_breakdown?.session_count || 1) + 1;
    const avgScore = (existing.overall_score + report.overall_score) / 2;
    const avgLogical = (existing.logical_reasoning_score + report.dimension_scores.logical_reasoning) / 2;
    const avgBias = (existing.bias_awareness_score + report.dimension_scores.bias_awareness) / 2;
    const avgPerspective = (existing.perspective_taking_score + report.dimension_scores.perspective_taking) / 2;
    const avgEmotional = (existing.emotional_regulation_score + report.dimension_scores.emotional_regulation) / 2;

    const { error: updateError } = await supabase
      .from('growth_snapshots')
      .update({
        overall_score: Math.round(avgScore),
        logical_reasoning_score: Math.round(avgLogical),
        bias_awareness_score: Math.round(avgBias),
        perspective_taking_score: Math.round(avgPerspective),
        emotional_regulation_score: Math.round(avgEmotional),
        metrics_breakdown: {
          session_count: sessionCount,
          conversation_ids: [...(existing.metrics_breakdown?.conversation_ids || []), conversationId],
          last_updated: new Date().toISOString(),
        },
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Failed to update snapshot:', updateError);
    }

    return { created: true, date: today, isFirstOfDay: false };
  }

  // Create new snapshot
  const { error: insertError } = await supabase
    .from('growth_snapshots')
    .insert({
      user_id: userId,
      snapshot_date: today,
      overall_score: report.overall_score,
      logical_reasoning_score: report.dimension_scores.logical_reasoning,
      bias_awareness_score: report.dimension_scores.bias_awareness,
      perspective_taking_score: report.dimension_scores.perspective_taking,
      emotional_regulation_score: report.dimension_scores.emotional_regulation,
      metrics_breakdown: {
        session_count: 1,
        conversation_ids: [conversationId],
        created: new Date().toISOString(),
      },
    });

  if (insertError) {
    console.error('Failed to create snapshot:', insertError);
  }

  return { created: true, date: today, isFirstOfDay: true };
}

/**
 * Get the user's total session count from conversations table
 */
export async function getUserSessionCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    console.error('Failed to get session count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get days since last session (for comeback achievement)
 */
export async function getDaysSinceLastSession(
  supabase: SupabaseClient,
  userId: string,
  currentConversationId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('ended_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('id', currentConversationId)
    .order('ended_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.ended_at) {
    return null; // First session ever
  }

  const lastSession = new Date(data.ended_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastSession.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
