/**
 * Gamification Types
 * Shared types for gamification processing
 */

export interface DimensionScores {
  logical_reasoning: number;
  bias_awareness: number;
  perspective_taking: number;
  emotional_regulation: number;
}

export interface SessionReport {
  tldr: string;
  strengths: string[];
  weaknesses: string[];
  detailed_analysis: string;
  overall_score: number;
  dimension_scores: DimensionScores;
  generated_at: string;
}

export interface SessionContext {
  userId: string;
  conversationId: string;
  report: SessionReport;
  sessionTime: Date;
}

export interface GamificationResult {
  snapshot: {
    created: boolean;
    date: string;
  };
  xp: {
    awarded: number;
    newTotal: number;
    levelUp: boolean;
    newLevel?: number;
  };
  streak: {
    current: number;
    isNew: boolean;
    milestone?: number;
  };
  achievements: {
    id: string;
    name: string;
    xpReward: number;
  }[];
  insights: {
    id: string;
    type: string;
    title: string;
  }[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'milestone' | 'streak' | 'score' | 'pattern' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  requirement_dimension?: string;
}

export interface UserProgress {
  user_id: string;
  current_xp: number;
  current_level: number;
  lifetime_xp: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
}

export interface InsightInput {
  user_id: string;
  insight_type: 'celebration' | 'focus' | 'recommendation' | 'warning' | 'milestone';
  trigger_event: string;
  title: string;
  message: string;
  action_type?: string;
  action_data?: Record<string, unknown>;
  priority: number;
  expires_at?: string;
}
