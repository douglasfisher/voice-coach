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
          updated_at?: string;
        };
      };
      personas: {
        Row: {
          id: string;
          name: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
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
