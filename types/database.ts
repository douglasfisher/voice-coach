export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          onboarding_completed: boolean;
          current_level: number;
          total_sessions: number;
          streak_days: number;
          last_session_at: string | null;
          is_admin: boolean;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
          current_level?: number;
          total_sessions?: number;
          streak_days?: number;
          last_session_at?: string | null;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
          current_level?: number;
          total_sessions?: number;
          streak_days?: number;
          last_session_at?: string | null;
          is_admin?: boolean;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          preferred_challenge_intensity: number;
          tts_enabled: boolean;
          voice_input_enabled: boolean;
          notification_daily_challenge: boolean;
          notification_time: string;
          theme: string;
          preferred_persona_ids: string[] | null;
          avoided_topics: string[] | null;
          immersive_chat_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_challenge_intensity?: number;
          tts_enabled?: boolean;
          voice_input_enabled?: boolean;
          notification_daily_challenge?: boolean;
          notification_time?: string;
          theme?: string;
          preferred_persona_ids?: string[] | null;
          avoided_topics?: string[] | null;
          immersive_chat_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          preferred_challenge_intensity?: number;
          tts_enabled?: boolean;
          voice_input_enabled?: boolean;
          notification_daily_challenge?: boolean;
          notification_time?: string;
          theme?: string;
          preferred_persona_ids?: string[] | null;
          avoided_topics?: string[] | null;
          immersive_chat_enabled?: boolean;
          updated_at?: string;
        };
      };
      personas: {
        Row: {
          id: string;
          name: string;
          title: string | null;
          tagline: string | null;
          avatar_url: string;
          avatar_thumbnail_url: string | null;
          voice_provider: string;
          voice_id: string;
          voice_speed: number;
          voice_pitch: number;
          voice_stability: number;
          warmth: number;
          directness: number;
          patience: number;
          humor: number;
          formality: number;
          challenge_style: string;
          specialty_areas: string[] | null;
          cultural_background: string | null;
          system_prompt: string;
          is_active: boolean;
          is_premium: boolean;
          sort_order: number;
          ai_config: {
            model?: string;
            fallback_model?: string;
            temperature?: number;
            top_p?: number;
            max_completion_tokens?: number;
            stop?: string[];
            cost_per_million_input?: number;
            cost_per_million_output?: number;
          } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          title?: string | null;
          tagline?: string | null;
          avatar_url: string;
          avatar_thumbnail_url?: string | null;
          voice_provider: string;
          voice_id: string;
          voice_speed?: number;
          voice_pitch?: number;
          voice_stability?: number;
          warmth?: number;
          directness?: number;
          patience?: number;
          humor?: number;
          formality?: number;
          challenge_style: string;
          specialty_areas?: string[] | null;
          cultural_background?: string | null;
          system_prompt: string;
          is_active?: boolean;
          is_premium?: boolean;
          sort_order?: number;
          ai_config?: {
            model?: string;
            fallback_model?: string;
            temperature?: number;
            top_p?: number;
            max_completion_tokens?: number;
            stop?: string[];
            cost_per_million_input?: number;
            cost_per_million_output?: number;
          } | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          title?: string | null;
          tagline?: string | null;
          avatar_url?: string;
          avatar_thumbnail_url?: string | null;
          voice_provider?: string;
          voice_id?: string;
          voice_speed?: number;
          voice_pitch?: number;
          voice_stability?: number;
          warmth?: number;
          directness?: number;
          patience?: number;
          humor?: number;
          formality?: number;
          challenge_style?: string;
          specialty_areas?: string[] | null;
          cultural_background?: string | null;
          system_prompt?: string;
          is_active?: boolean;
          is_premium?: boolean;
          sort_order?: number;
          ai_config?: {
            model?: string;
            fallback_model?: string;
            temperature?: number;
            top_p?: number;
            max_completion_tokens?: number;
            stop?: string[];
            cost_per_million_input?: number;
            cost_per_million_output?: number;
          } | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          title: string | null;
          topic: string | null;
          starter_prompt_id: string | null;
          status: 'active' | 'completed' | 'abandoned';
          started_at: string;
          ended_at: string | null;
          analysis_summary: Json | null;
          overall_score: number | null;
          timing_metrics: {
            total_duration_ms: number;
            user_avg_response_ms: number;
            assistant_avg_response_ms: number;
            exchange_count: number;
            word_count_total: number;
          } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          title?: string | null;
          topic?: string | null;
          starter_prompt_id?: string | null;
          status?: 'active' | 'completed' | 'abandoned';
          started_at?: string;
          ended_at?: string | null;
          analysis_summary?: Json | null;
          overall_score?: number | null;
          timing_metrics?: {
            total_duration_ms: number;
            user_avg_response_ms: number;
            assistant_avg_response_ms: number;
            exchange_count: number;
            word_count_total: number;
          } | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          persona_id?: string;
          title?: string | null;
          topic?: string | null;
          starter_prompt_id?: string | null;
          status?: 'active' | 'completed' | 'abandoned';
          started_at?: string;
          ended_at?: string | null;
          analysis_summary?: Json | null;
          overall_score?: number | null;
          timing_metrics?: {
            total_duration_ms: number;
            user_avg_response_ms: number;
            assistant_avg_response_ms: number;
            exchange_count: number;
            word_count_total: number;
          } | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          audio_url: string | null;
          audio_duration_ms: number | null;
          analysis: Json | null;
          sequence: number;
          response_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          audio_url?: string | null;
          audio_duration_ms?: number | null;
          analysis?: Json | null;
          sequence: number;
          response_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          audio_url?: string | null;
          audio_duration_ms?: number | null;
          analysis?: Json | null;
          sequence?: number;
          response_time_ms?: number | null;
          created_at?: string;
        };
      };
      conversation_starters: {
        Row: {
          id: string;
          prompt_text: string;
          category: string;
          difficulty_level: number;
          recommended_personas: string[] | null;
          topics: string[] | null;
          times_used: number;
          avg_engagement_score: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_text: string;
          category: string;
          difficulty_level?: number;
          recommended_personas?: string[] | null;
          topics?: string[] | null;
          times_used?: number;
          avg_engagement_score?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_text?: string;
          category?: string;
          difficulty_level?: number;
          recommended_personas?: string[] | null;
          topics?: string[] | null;
          times_used?: number;
          avg_engagement_score?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      daily_challenges: {
        Row: {
          id: string;
          user_id: string;
          starter_id: string;
          challenge_date: string;
          completed: boolean;
          conversation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          starter_id: string;
          challenge_date: string;
          completed?: boolean;
          conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          starter_id?: string;
          challenge_date?: string;
          completed?: boolean;
          conversation_id?: string | null;
          created_at?: string;
        };
      };
      analysis_items: {
        Row: {
          id: string;
          message_id: string;
          item_type: string;
          item_code: string;
          item_label: string;
          severity: 'minor' | 'moderate' | 'significant' | null;
          text_excerpt: string | null;
          explanation: string | null;
          coaching_suggestion: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          item_type: string;
          item_code: string;
          item_label: string;
          severity?: 'minor' | 'moderate' | 'significant' | null;
          text_excerpt?: string | null;
          explanation?: string | null;
          coaching_suggestion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          item_type?: string;
          item_code?: string;
          item_label?: string;
          severity?: 'minor' | 'moderate' | 'significant' | null;
          text_excerpt?: string | null;
          explanation?: string | null;
          coaching_suggestion?: string | null;
          created_at?: string;
        };
      };
      user_patterns: {
        Row: {
          id: string;
          user_id: string;
          pattern_type: string;
          pattern_code: string;
          occurrence_count: number;
          first_detected_at: string;
          last_detected_at: string;
          trend: 'improving' | 'stable' | 'worsening' | null;
          improvement_percentage: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          pattern_type: string;
          pattern_code: string;
          occurrence_count?: number;
          first_detected_at?: string;
          last_detected_at?: string;
          trend?: 'improving' | 'stable' | 'worsening' | null;
          improvement_percentage?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          pattern_type?: string;
          pattern_code?: string;
          occurrence_count?: number;
          first_detected_at?: string;
          last_detected_at?: string;
          trend?: 'improving' | 'stable' | 'worsening' | null;
          improvement_percentage?: number | null;
        };
      };
      growth_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          logical_reasoning_score: number | null;
          bias_awareness_score: number | null;
          perspective_taking_score: number | null;
          emotional_regulation_score: number | null;
          overall_score: number | null;
          metrics_breakdown: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          logical_reasoning_score?: number | null;
          bias_awareness_score?: number | null;
          perspective_taking_score?: number | null;
          emotional_regulation_score?: number | null;
          overall_score?: number | null;
          metrics_breakdown?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          logical_reasoning_score?: number | null;
          bias_awareness_score?: number | null;
          perspective_taking_score?: number | null;
          emotional_regulation_score?: number | null;
          overall_score?: number | null;
          metrics_breakdown?: Json | null;
          created_at?: string;
        };
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string | null;
          conversation_id: string | null;
          persona_id: string | null;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          persona_id?: string | null;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost_cents: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          conversation_id?: string | null;
          persona_id?: string | null;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost_cents?: number;
          created_at?: string;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      ai_models: {
        Row: {
          id: string;
          name: string;
          provider: string;
          context_window: number | null;
          active: boolean;
          owned_by: string | null;
          cost_per_million_input: number;
          cost_per_million_output: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          provider?: string;
          context_window?: number | null;
          active?: boolean;
          owned_by?: string | null;
          cost_per_million_input?: number;
          cost_per_million_output?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          provider?: string;
          context_window?: number | null;
          active?: boolean;
          owned_by?: string | null;
          cost_per_million_input?: number;
          cost_per_million_output?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_progress: {
        Row: {
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
          velocity_trend: 'accelerating' | 'stable' | 'decelerating' | null;
          projected_score_30day: number | null;
          optimal_potential_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_xp?: number;
          current_level?: number;
          lifetime_xp?: number;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          streak_freeze_available?: number;
          streak_freeze_used_this_week?: boolean;
          growth_velocity?: number | null;
          velocity_trend?: 'accelerating' | 'stable' | 'decelerating' | null;
          projected_score_30day?: number | null;
          optimal_potential_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          current_xp?: number;
          current_level?: number;
          lifetime_xp?: number;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          streak_freeze_available?: number;
          streak_freeze_used_this_week?: boolean;
          growth_velocity?: number | null;
          velocity_trend?: 'accelerating' | 'stable' | 'decelerating' | null;
          projected_score_30day?: number | null;
          optimal_potential_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: 'milestone' | 'streak' | 'score' | 'pattern' | 'special';
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
          icon: string;
          xp_reward: number;
          requirement_type: string;
          requirement_value: number;
          requirement_dimension: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          category: 'milestone' | 'streak' | 'score' | 'pattern' | 'special';
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
          icon: string;
          xp_reward?: number;
          requirement_type: string;
          requirement_value: number;
          requirement_dimension?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: 'milestone' | 'streak' | 'score' | 'pattern' | 'special';
          rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
          icon?: string;
          xp_reward?: number;
          requirement_type?: string;
          requirement_value?: number;
          requirement_dimension?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
          xp_awarded: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
          xp_awarded?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
          xp_awarded?: number;
        };
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          source: string;
          source_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          source: string;
          source_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          source?: string;
          source_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      growth_projections: {
        Row: {
          id: string;
          user_id: string;
          current_overall: number | null;
          current_logical: number | null;
          current_bias_awareness: number | null;
          current_perspective: number | null;
          current_emotional: number | null;
          projected_30_day: number | null;
          optimal_potential: number | null;
          dimension_projections: Json | null;
          limiting_factor: string | null;
          confidence_level: number | null;
          valid_until: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_overall?: number | null;
          current_logical?: number | null;
          current_bias_awareness?: number | null;
          current_perspective?: number | null;
          current_emotional?: number | null;
          projected_30_day?: number | null;
          optimal_potential?: number | null;
          dimension_projections?: Json | null;
          limiting_factor?: string | null;
          confidence_level?: number | null;
          valid_until: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_overall?: number | null;
          current_logical?: number | null;
          current_bias_awareness?: number | null;
          current_perspective?: number | null;
          current_emotional?: number | null;
          projected_30_day?: number | null;
          optimal_potential?: number | null;
          dimension_projections?: Json | null;
          limiting_factor?: string | null;
          confidence_level?: number | null;
          valid_until?: string;
          created_at?: string;
        };
      };
      user_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type: 'celebration' | 'focus' | 'recommendation' | 'warning' | 'milestone';
          trigger_event: string | null;
          title: string;
          message: string;
          action_type: string | null;
          action_data: Json | null;
          dismissed: boolean;
          read_at: string | null;
          priority: number;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          insight_type: 'celebration' | 'focus' | 'recommendation' | 'warning' | 'milestone';
          trigger_event?: string | null;
          title: string;
          message: string;
          action_type?: string | null;
          action_data?: Json | null;
          dismissed?: boolean;
          read_at?: string | null;
          priority?: number;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          insight_type?: 'celebration' | 'focus' | 'recommendation' | 'warning' | 'milestone';
          trigger_event?: string | null;
          title?: string;
          message?: string;
          action_type?: string | null;
          action_data?: Json | null;
          dismissed?: boolean;
          read_at?: string | null;
          priority?: number;
          created_at?: string;
          expires_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type UserProfile = Tables<'user_profiles'>;
export type UserPreferences = Tables<'user_preferences'>;
export type Persona = Tables<'personas'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type ConversationStarter = Tables<'conversation_starters'>;
export type DailyChallenge = Tables<'daily_challenges'>;
export type AnalysisItem = Tables<'analysis_items'>;
export type UserPattern = Tables<'user_patterns'>;
export type GrowthSnapshot = Tables<'growth_snapshots'>;
export type AIUsage = Tables<'ai_usage'>;
export type AppSettings = Tables<'app_settings'>;
export type AIModel = Tables<'ai_models'>;
export type UserProgressDB = Tables<'user_progress'>;
export type AchievementDB = Tables<'achievements'>;
export type UserAchievementDB = Tables<'user_achievements'>;
export type XPTransactionDB = Tables<'xp_transactions'>;
export type GrowthProjectionDB = Tables<'growth_projections'>;
export type UserInsightDB = Tables<'user_insights'>;
