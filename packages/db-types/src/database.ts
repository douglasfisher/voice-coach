export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _migration_history: {
        Row: {
          applied_at: string | null
          filename: string
          id: number
        }
        Insert: {
          applied_at?: string | null
          filename: string
          id?: number
        }
        Update: {
          applied_at?: string | null
          filename?: string
          id?: number
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_dimension: string | null
          requirement_type: string
          requirement_value: number
          sort_order: number
          xp_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_dimension?: string | null
          requirement_type: string
          requirement_value: number
          sort_order?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          requirement_dimension?: string | null
          requirement_type?: string
          requirement_value?: number
          sort_order?: number
          xp_reward?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          diff: Json | null
          id: string
          ip: unknown
          request_id: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip?: unknown
          request_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip?: unknown
          request_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      advisor_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          tagline: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          tagline?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          tagline?: string | null
        }
        Relationships: []
      }
      ai_budgets: {
        Row: {
          alert_threshold_percent: number | null
          budget_type: string
          created_at: string | null
          current_spend_cents: number | null
          id: string
          is_active: boolean | null
          limit_cents: number
          name: string
          notify_on_exceeded: boolean | null
          notify_on_threshold: boolean | null
          period_end: string | null
          period_start: string | null
          updated_at: string | null
        }
        Insert: {
          alert_threshold_percent?: number | null
          budget_type: string
          created_at?: string | null
          current_spend_cents?: number | null
          id?: string
          is_active?: boolean | null
          limit_cents: number
          name: string
          notify_on_exceeded?: boolean | null
          notify_on_threshold?: boolean | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_threshold_percent?: number | null
          budget_type?: string
          created_at?: string | null
          current_spend_cents?: number | null
          id?: string
          is_active?: boolean | null
          limit_cents?: number
          name?: string
          notify_on_exceeded?: boolean | null
          notify_on_threshold?: boolean | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_cost_snapshots: {
        Row: {
          cost_by_model: Json | null
          cost_by_persona: Json | null
          cost_by_user: Json | null
          created_at: string | null
          id: string
          snapshot_date: string
          total_cost_cents: number
          total_requests: number
          total_tokens: number
        }
        Insert: {
          cost_by_model?: Json | null
          cost_by_persona?: Json | null
          cost_by_user?: Json | null
          created_at?: string | null
          id?: string
          snapshot_date: string
          total_cost_cents?: number
          total_requests?: number
          total_tokens?: number
        }
        Update: {
          cost_by_model?: Json | null
          cost_by_persona?: Json | null
          cost_by_user?: Json | null
          created_at?: string | null
          id?: string
          snapshot_date?: string
          total_cost_cents?: number
          total_requests?: number
          total_tokens?: number
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          active: boolean
          context_window: number | null
          cost_per_million_input: number | null
          cost_per_million_output: number | null
          created_at: string
          id: string
          name: string
          owned_by: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          context_window?: number | null
          cost_per_million_input?: number | null
          cost_per_million_output?: number | null
          created_at?: string
          id: string
          name: string
          owned_by?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          context_window?: number | null
          cost_per_million_input?: number | null
          cost_per_million_output?: number | null
          created_at?: string
          id?: string
          name?: string
          owned_by?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          created_at: string | null
          estimated_cost_cents: number
          id: string
          latency_ms: number | null
          model: string
          persona_id: string | null
          prompt_tokens: number
          task_type: string | null
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_cents?: number
          id?: string
          latency_ms?: number | null
          model: string
          persona_id?: string | null
          prompt_tokens?: number
          task_type?: string | null
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_cents?: number
          id?: string
          latency_ms?: number | null
          model?: string
          persona_id?: string | null
          prompt_tokens?: number
          task_type?: string | null
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_items: {
        Row: {
          coaching_suggestion: string | null
          created_at: string | null
          explanation: string | null
          id: string
          item_code: string
          item_label: string
          item_type: string
          message_id: string
          severity: string | null
          text_excerpt: string | null
        }
        Insert: {
          coaching_suggestion?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          item_code: string
          item_label: string
          item_type: string
          message_id: string
          severity?: string | null
          text_excerpt?: string | null
        }
        Update: {
          coaching_suggestion?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          item_code?: string
          item_label?: string
          item_type?: string
          message_id?: string
          severity?: string | null
          text_excerpt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          ethnicity: string | null
          gender: string | null
          generation_batch_id: string | null
          id: string
          is_hi_res: boolean | null
          params: Json | null
          prompt: string | null
          public_url: string
          storage_path: string
          used_by_persona_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ethnicity?: string | null
          gender?: string | null
          generation_batch_id?: string | null
          id?: string
          is_hi_res?: boolean | null
          params?: Json | null
          prompt?: string | null
          public_url: string
          storage_path: string
          used_by_persona_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ethnicity?: string | null
          gender?: string | null
          generation_batch_id?: string | null
          id?: string
          is_hi_res?: boolean | null
          params?: Json | null
          prompt?: string | null
          public_url?: string
          storage_path?: string
          used_by_persona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_library_used_by_persona_id_fkey"
            columns: ["used_by_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_domains: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          slug: string
          sort_order: number | null
          tagline: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          tagline?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          tagline?: string | null
        }
        Relationships: []
      }
      conversation_starters: {
        Row: {
          avg_engagement_score: number | null
          category: string
          created_at: string | null
          difficulty_level: number | null
          id: string
          is_active: boolean | null
          prompt_text: string
          recommended_personas: string[] | null
          times_used: number | null
          topics: string[] | null
        }
        Insert: {
          avg_engagement_score?: number | null
          category: string
          created_at?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          prompt_text: string
          recommended_personas?: string[] | null
          times_used?: number | null
          topics?: string[] | null
        }
        Update: {
          avg_engagement_score?: number | null
          category?: string
          created_at?: string | null
          difficulty_level?: number | null
          id?: string
          is_active?: boolean | null
          prompt_text?: string
          recommended_personas?: string[] | null
          times_used?: number | null
          topics?: string[] | null
        }
        Relationships: []
      }
      conversation_traits: {
        Row: {
          conversation_id: string
          trait_option_id: string
        }
        Insert: {
          conversation_id: string
          trait_option_id: string
        }
        Update: {
          conversation_id?: string
          trait_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_traits_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_traits_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          analysis_summary: Json | null
          created_at: string | null
          current_phase: string | null
          domain_id: string | null
          ended_at: string | null
          id: string
          interaction_mode: string | null
          overall_score: number | null
          persona_id: string
          scenario_id: string | null
          scenario_variant: Json | null
          started_at: string | null
          starter_prompt_id: string | null
          status: string | null
          timing_metrics: Json | null
          title: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          analysis_summary?: Json | null
          created_at?: string | null
          current_phase?: string | null
          domain_id?: string | null
          ended_at?: string | null
          id?: string
          interaction_mode?: string | null
          overall_score?: number | null
          persona_id: string
          scenario_id?: string | null
          scenario_variant?: Json | null
          started_at?: string | null
          starter_prompt_id?: string | null
          status?: string | null
          timing_metrics?: Json | null
          title?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          analysis_summary?: Json | null
          created_at?: string | null
          current_phase?: string | null
          domain_id?: string | null
          ended_at?: string | null
          id?: string
          interaction_mode?: string | null
          overall_score?: number | null
          persona_id?: string
          scenario_id?: string | null
          scenario_variant?: Json | null
          started_at?: string | null
          starter_prompt_id?: string | null
          status?: string | null
          timing_metrics?: Json | null
          title?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "coaching_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          completed: boolean | null
          conversation_id: string | null
          created_at: string | null
          id: string
          starter_id: string
          user_id: string
        }
        Insert: {
          challenge_date: string
          completed?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          starter_id: string
          user_id: string
        }
        Update: {
          challenge_date?: string
          completed?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          starter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenges_starter_id_fkey"
            columns: ["starter_id"]
            isOneToOne: false
            referencedRelation: "conversation_starters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_projections: {
        Row: {
          confidence_level: number | null
          created_at: string
          current_bias_awareness: number | null
          current_emotional: number | null
          current_logical: number | null
          current_overall: number | null
          current_perspective: number | null
          dimension_projections: Json | null
          id: string
          limiting_factor: string | null
          optimal_potential: number | null
          projected_30_day: number | null
          user_id: string
          valid_until: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          current_bias_awareness?: number | null
          current_emotional?: number | null
          current_logical?: number | null
          current_overall?: number | null
          current_perspective?: number | null
          dimension_projections?: Json | null
          id?: string
          limiting_factor?: string | null
          optimal_potential?: number | null
          projected_30_day?: number | null
          user_id: string
          valid_until: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          current_bias_awareness?: number | null
          current_emotional?: number | null
          current_logical?: number | null
          current_overall?: number | null
          current_perspective?: number | null
          dimension_projections?: Json | null
          id?: string
          limiting_factor?: string | null
          optimal_potential?: number | null
          projected_30_day?: number | null
          user_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_projections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_projections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_snapshots: {
        Row: {
          bias_awareness_score: number | null
          created_at: string | null
          emotional_regulation_score: number | null
          id: string
          logical_reasoning_score: number | null
          metrics_breakdown: Json | null
          overall_score: number | null
          perspective_taking_score: number | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          bias_awareness_score?: number | null
          created_at?: string | null
          emotional_regulation_score?: number | null
          id?: string
          logical_reasoning_score?: number | null
          metrics_breakdown?: Json | null
          overall_score?: number | null
          perspective_taking_score?: number | null
          snapshot_date: string
          user_id: string
        }
        Update: {
          bias_awareness_score?: number | null
          created_at?: string | null
          emotional_regulation_score?: number | null
          id?: string
          logical_reasoning_score?: number | null
          metrics_breakdown?: Json | null
          overall_score?: number | null
          perspective_taking_score?: number | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          analysis: Json | null
          audio_duration_ms: number | null
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          role: string
          sequence: number
        }
        Insert: {
          analysis?: Json | null
          audio_duration_ms?: number | null
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          role: string
          sequence: number
        }
        Update: {
          analysis?: Json | null
          audio_duration_ms?: number | null
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          role?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_prompt_history: {
        Row: {
          edited_at: string
          edited_by: string | null
          edited_by_email: string | null
          id: string
          persona_id: string
          prompt_sections: Json | null
          reason: string | null
          system_prompt: string | null
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          edited_by_email?: string | null
          id?: string
          persona_id: string
          prompt_sections?: Json | null
          reason?: string | null
          system_prompt?: string | null
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          edited_by_email?: string | null
          id?: string
          persona_id?: string
          prompt_sections?: Json | null
          reason?: string | null
          system_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_prompt_history_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_trait_defaults: {
        Row: {
          persona_id: string
          trait_option_id: string
        }
        Insert: {
          persona_id: string
          trait_option_id: string
        }
        Update: {
          persona_id?: string
          trait_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_trait_defaults_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_trait_defaults_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          advisor_category_id: string | null
          age_range: string | null
          ai_config: Json | null
          avatar_params: Json | null
          avatar_thumbnail_url: string | null
          avatar_url: string
          challenge_style: string
          coaching_style: string | null
          created_at: string | null
          cultural_background: string | null
          default_interaction_mode: string | null
          directness: number | null
          domain_id: string | null
          emotional_progression_enabled: boolean | null
          feedback_style: string | null
          formality: number | null
          gender: string
          humor: number | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          mode_prompts: Json | null
          name: string
          patience: number | null
          persona_type: string | null
          prompt_sections: Json | null
          qa_scenario_prompt: string | null
          qa_scene_template: string | null
          sort_order: number | null
          specialty_areas: string[] | null
          system_prompt: string
          tagline: string | null
          voice_id: string
          voice_pitch: number | null
          voice_provider: string
          voice_speed: number | null
          voice_stability: number | null
          warmth: number | null
        }
        Insert: {
          advisor_category_id?: string | null
          age_range?: string | null
          ai_config?: Json | null
          avatar_params?: Json | null
          avatar_thumbnail_url?: string | null
          avatar_url: string
          challenge_style: string
          coaching_style?: string | null
          created_at?: string | null
          cultural_background?: string | null
          default_interaction_mode?: string | null
          directness?: number | null
          domain_id?: string | null
          emotional_progression_enabled?: boolean | null
          feedback_style?: string | null
          formality?: number | null
          gender?: string
          humor?: number | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          mode_prompts?: Json | null
          name: string
          patience?: number | null
          persona_type?: string | null
          prompt_sections?: Json | null
          qa_scenario_prompt?: string | null
          qa_scene_template?: string | null
          sort_order?: number | null
          specialty_areas?: string[] | null
          system_prompt: string
          tagline?: string | null
          voice_id: string
          voice_pitch?: number | null
          voice_provider: string
          voice_speed?: number | null
          voice_stability?: number | null
          warmth?: number | null
        }
        Update: {
          advisor_category_id?: string | null
          age_range?: string | null
          ai_config?: Json | null
          avatar_params?: Json | null
          avatar_thumbnail_url?: string | null
          avatar_url?: string
          challenge_style?: string
          coaching_style?: string | null
          created_at?: string | null
          cultural_background?: string | null
          default_interaction_mode?: string | null
          directness?: number | null
          domain_id?: string | null
          emotional_progression_enabled?: boolean | null
          feedback_style?: string | null
          formality?: number | null
          gender?: string
          humor?: number | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          mode_prompts?: Json | null
          name?: string
          patience?: number | null
          persona_type?: string | null
          prompt_sections?: Json | null
          qa_scenario_prompt?: string | null
          qa_scene_template?: string | null
          sort_order?: number | null
          specialty_areas?: string[] | null
          system_prompt?: string
          tagline?: string | null
          voice_id?: string
          voice_pitch?: number | null
          voice_provider?: string
          voice_speed?: number | null
          voice_stability?: number | null
          warmth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_advisor_category_id_fkey"
            columns: ["advisor_category_id"]
            isOneToOne: false
            referencedRelation: "advisor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "coaching_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          domain_id: string
          id: string
          interaction_mode: string
          is_active: boolean | null
          name: string
          recommended_coaches: string[] | null
          scenario_context: string
          situation_variants: Json | null
          slug: string
          sort_order: number | null
          user_goal: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          domain_id: string
          id?: string
          interaction_mode?: string
          is_active?: boolean | null
          name: string
          recommended_coaches?: string[] | null
          scenario_context: string
          situation_variants?: Json | null
          slug: string
          sort_order?: number | null
          user_goal?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          domain_id?: string
          id?: string
          interaction_mode?: string
          is_active?: boolean | null
          name?: string
          recommended_coaches?: string[] | null
          scenario_context?: string
          situation_variants?: Json | null
          slug?: string
          sort_order?: number | null
          user_goal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "coaching_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_categories: {
        Row: {
          applies_to: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          user_visible: boolean | null
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          user_visible?: boolean | null
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          user_visible?: boolean | null
        }
        Relationships: []
      }
      trait_options: {
        Row: {
          category_id: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          prompt_modifier: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          prompt_modifier: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          prompt_modifier?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trait_options_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "trait_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          app_version: string | null
          category: string
          created_at: string
          current_route: string | null
          device_model: string | null
          id: string
          message: string
          metadata: Json | null
          os_version: string | null
          screenshot_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          app_version?: string | null
          category: string
          created_at?: string
          current_route?: string | null
          device_model?: string | null
          id?: string
          message: string
          metadata?: Json | null
          os_version?: string | null
          screenshot_path?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          app_version?: string | null
          category?: string
          created_at?: string
          current_route?: string | null
          device_model?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          os_version?: string | null
          screenshot_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_insights: {
        Row: {
          action_data: Json | null
          action_type: string | null
          created_at: string
          dismissed: boolean
          expires_at: string | null
          id: string
          insight_type: string
          message: string
          priority: number
          read_at: string | null
          title: string
          trigger_event: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: string
          insight_type: string
          message: string
          priority?: number
          read_at?: string | null
          title: string
          trigger_event?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          dismissed?: boolean
          expires_at?: string | null
          id?: string
          insight_type?: string
          message?: string
          priority?: number
          read_at?: string | null
          title?: string
          trigger_event?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_patterns: {
        Row: {
          first_detected_at: string | null
          id: string
          improvement_percentage: number | null
          last_detected_at: string | null
          occurrence_count: number | null
          pattern_code: string
          pattern_type: string
          trend: string | null
          user_id: string
        }
        Insert: {
          first_detected_at?: string | null
          id?: string
          improvement_percentage?: number | null
          last_detected_at?: string | null
          occurrence_count?: number | null
          pattern_code: string
          pattern_type: string
          trend?: string | null
          user_id: string
        }
        Update: {
          first_detected_at?: string | null
          id?: string
          improvement_percentage?: number | null
          last_detected_at?: string | null
          occurrence_count?: number | null
          pattern_code?: string
          pattern_type?: string
          trend?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avoided_topics: string[] | null
          immersive_chat_enabled: boolean | null
          interested_in: string | null
          native_tts_enabled: boolean
          notification_daily_challenge: boolean | null
          notification_time: string | null
          preferred_challenge_intensity: number | null
          preferred_persona_ids: string[] | null
          theme: string | null
          tts_enabled: boolean | null
          updated_at: string | null
          user_gender: string | null
          user_id: string
          voice_input_enabled: boolean | null
        }
        Insert: {
          avoided_topics?: string[] | null
          immersive_chat_enabled?: boolean | null
          interested_in?: string | null
          native_tts_enabled?: boolean
          notification_daily_challenge?: boolean | null
          notification_time?: string | null
          preferred_challenge_intensity?: number | null
          preferred_persona_ids?: string[] | null
          theme?: string | null
          tts_enabled?: boolean | null
          updated_at?: string | null
          user_gender?: string | null
          user_id: string
          voice_input_enabled?: boolean | null
        }
        Update: {
          avoided_topics?: string[] | null
          immersive_chat_enabled?: boolean | null
          interested_in?: string | null
          native_tts_enabled?: boolean
          notification_daily_challenge?: boolean | null
          notification_time?: string | null
          preferred_challenge_intensity?: number | null
          preferred_persona_ids?: string[] | null
          theme?: string | null
          tts_enabled?: boolean | null
          updated_at?: string | null
          user_gender?: string | null
          user_id?: string
          voice_input_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          created_at: string | null
          current_level: number | null
          disabled: boolean
          display_name: string | null
          id: string
          is_admin: boolean | null
          last_session_at: string | null
          onboarding_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          streak_days: number | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          disabled?: boolean
          display_name?: string | null
          id: string
          is_admin?: boolean | null
          last_session_at?: string | null
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          disabled?: boolean
          display_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_session_at?: string | null
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          streak_days?: number | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          current_xp: number
          growth_velocity: number | null
          last_session_date: string | null
          lifetime_xp: number
          longest_streak: number
          optimal_potential_score: number | null
          projected_score_30day: number | null
          streak_freeze_available: number
          streak_freeze_used_this_week: boolean
          updated_at: string
          user_id: string
          velocity_trend: string | null
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          growth_velocity?: number | null
          last_session_date?: string | null
          lifetime_xp?: number
          longest_streak?: number
          optimal_potential_score?: number | null
          projected_score_30day?: number | null
          streak_freeze_available?: number
          streak_freeze_used_this_week?: boolean
          updated_at?: string
          user_id: string
          velocity_trend?: string | null
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          growth_velocity?: number | null
          last_session_date?: string | null
          lifetime_xp?: number
          longest_streak?: number
          optimal_potential_score?: number | null
          projected_score_30day?: number | null
          streak_freeze_available?: number
          streak_freeze_used_this_week?: boolean
          updated_at?: string
          user_id?: string
          velocity_trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users_overview: {
        Row: {
          admin_notes: string | null
          auth_created_at: string | null
          avatar_url: string | null
          current_level: number | null
          disabled: boolean | null
          display_name: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          is_admin: boolean | null
          last_session_at: string | null
          last_sign_in_at: string | null
          onboarding_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          streak_days: number | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          total_sessions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp: {
        Args: {
          p_amount: number
          p_description?: string
          p_source: string
          p_source_id?: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_ai_cost: {
        Args: {
          p_completion_tokens: number
          p_model: string
          p_prompt_tokens: number
        }
        Returns: number
      }
      create_daily_cost_snapshot: {
        Args: { p_date?: string }
        Returns: undefined
      }
      get_budget_current_spend: {
        Args: { p_budget_id: string }
        Returns: number
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      toggle_trait_user_visible: {
        Args: { p_category_id: string; p_visible: boolean }
        Returns: undefined
      }
      update_user_streak: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      subscription_tier:
        | "free"
        | "freemium"
        | "basic"
        | "pro"
        | "enterprise"
        | "team"
      user_role: "user" | "admin" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_tier: [
        "free",
        "freemium",
        "basic",
        "pro",
        "enterprise",
        "team",
      ],
      user_role: ["user", "admin", "superadmin"],
    },
  },
} as const
