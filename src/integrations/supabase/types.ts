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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_coaching_history: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_audit_reports: {
        Row: {
          created_at: string
          findings: Json
          id: string
          protections: Json
          report_type: string
          sources: Json
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          findings?: Json
          id?: string
          protections?: Json
          report_type?: string
          sources?: Json
          status?: string
          summary?: string
          user_id: string
        }
        Update: {
          created_at?: string
          findings?: Json
          id?: string
          protections?: Json
          report_type?: string
          sources?: Json
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          difficulty: number
          front: string
          id: string
          last_reviewed_at: string | null
          next_review_at: string | null
          review_count: number
          subject_id: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          difficulty?: number
          front: string
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_count?: number
          subject_id?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          difficulty?: number
          front?: string
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_count?: number
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_audit_logs: {
        Row: {
          after_state: Json | null
          before_state: Json | null
          created_at: string
          event_source: string
          event_type: string
          explanation: string
          id: string
          metadata: Json | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          event_source: string
          event_type: string
          explanation: string
          id?: string
          metadata?: Json | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          event_source?: string
          event_type?: string
          explanation?: string
          id?: string
          metadata?: Json | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banca: string | null
          created_at: string
          daily_hours: number | null
          exam_date: string | null
          full_name: string
          id: string
          onboarding_completed: boolean
          study_days: string[] | null
          target_exam: string | null
          target_position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banca?: string | null
          created_at?: string
          daily_hours?: number | null
          exam_date?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          study_days?: string[] | null
          target_exam?: string | null
          target_position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banca?: string | null
          created_at?: string
          daily_hours?: number | null
          exam_date?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          study_days?: string[] | null
          target_exam?: string | null
          target_position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psyche_checkins: {
        Row: {
          created_at: string
          energy: number
          focus: number
          id: string
          mood: number
          notes: string | null
          stress: number
          user_id: string
        }
        Insert: {
          created_at?: string
          energy?: number
          focus?: number
          id?: string
          mood?: number
          notes?: string | null
          stress?: number
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: number
          focus?: number
          id?: string
          mood?: number
          notes?: string | null
          stress?: number
          user_id?: string
        }
        Relationships: []
      }
      psyche_profiles: {
        Row: {
          anamnesis_completed: boolean | null
          anxiety_level: number | null
          attention_span_minutes: number | null
          best_study_period: string | null
          created_at: string
          current_mood: number | null
          focus_capacity: number | null
          has_neurodivergence: boolean | null
          id: string
          last_checkin_at: string | null
          mood_notes: string | null
          motivation_level: number | null
          neurodivergence_notes: string | null
          neurodivergence_type: string | null
          preferred_study_method: string | null
          sleep_quality: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anamnesis_completed?: boolean | null
          anxiety_level?: number | null
          attention_span_minutes?: number | null
          best_study_period?: string | null
          created_at?: string
          current_mood?: number | null
          focus_capacity?: number | null
          has_neurodivergence?: boolean | null
          id?: string
          last_checkin_at?: string | null
          mood_notes?: string | null
          motivation_level?: number | null
          neurodivergence_notes?: string | null
          neurodivergence_type?: string | null
          preferred_study_method?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anamnesis_completed?: boolean | null
          anxiety_level?: number | null
          attention_span_minutes?: number | null
          best_study_period?: string | null
          created_at?: string
          current_mood?: number | null
          focus_capacity?: number | null
          has_neurodivergence?: boolean | null
          id?: string
          last_checkin_at?: string | null
          mood_notes?: string | null
          motivation_level?: number | null
          neurodivergence_notes?: string | null
          neurodivergence_type?: string | null
          preferred_study_method?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_source_audits: {
        Row: {
          copyright_assessment: string
          created_at: string
          id: string
          origin: string
          source_note: string
          source_title: string
          source_url: string | null
          storage_notes: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          copyright_assessment?: string
          created_at?: string
          id?: string
          origin?: string
          source_note?: string
          source_title?: string
          source_url?: string | null
          storage_notes?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          copyright_assessment?: string
          created_at?: string
          id?: string
          origin?: string
          source_note?: string
          source_title?: string
          source_url?: string | null
          storage_notes?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_source_audits_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_source_audits_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string | null
          selected_option: number
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          selected_option: number
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          selected_option?: number
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option: number
          created_at: string
          difficulty: number
          explanation: string | null
          id: string
          options: Json
          question_text: string
          source: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          correct_option?: number
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          options?: Json
          question_text: string
          source?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          correct_option?: number
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          source?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          reminder_date: string
          text: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          reminder_date: string
          text: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          reminder_date?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      spaced_reviews: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          interval_days: number
          next_review_date: string | null
          performance_rating: number | null
          review_date: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          interval_days?: number
          next_review_date?: string | null
          performance_rating?: number | null
          review_date: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          interval_days?: number
          next_review_date?: string | null
          performance_rating?: number | null
          review_date?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaced_reviews_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_calendar_blocks: {
        Row: {
          auto_generated: boolean
          block_date: string
          block_type: string
          cognitive_load: string
          created_at: string
          duration_minutes: number
          id: string
          material_name: string | null
          order_index: number
          source: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generated?: boolean
          block_date: string
          block_type?: string
          cognitive_load?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          material_name?: string | null
          order_index?: number
          source?: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generated?: boolean
          block_date?: string
          block_type?: string
          cognitive_load?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          material_name?: string | null
          order_index?: number
          source?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_calendar_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          material_type: string
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          material_type?: string
          subject_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          material_type?: string
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan: {
        Row: {
          accuracy: number | null
          created_at: string
          gap_score: number | null
          id: string
          incidence: number | null
          performance: number | null
          priority_score: number | null
          recommended_hours_weekly: number | null
          relevance: number | null
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          gap_score?: number | null
          id?: string
          incidence?: number | null
          performance?: number | null
          priority_score?: number | null
          recommended_hours_weekly?: number | null
          relevance?: number | null
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          gap_score?: number | null
          id?: string
          incidence?: number | null
          performance?: number | null
          priority_score?: number | null
          recommended_hours_weekly?: number | null
          relevance?: number | null
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          comprehension_rating: number | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          material_name: string | null
          notes: string | null
          pages_end: number | null
          pages_start: number | null
          started_at: string
          subject_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          comprehension_rating?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          material_name?: string | null
          notes?: string | null
          pages_end?: number | null
          pages_start?: number | null
          started_at?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          comprehension_rating?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          material_name?: string | null
          notes?: string | null
          pages_end?: number | null
          pages_start?: number | null
          started_at?: string
          subject_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      topic_review_schedules: {
        Row: {
          comprehension_score: number
          created_at: string
          forgetting_risk: number
          id: string
          intensity_score: number
          interval_days: number
          last_reviewed_at: string | null
          last_studied_at: string | null
          next_review_at: string
          psyche_score: number
          recommendation: string
          status: string
          subject_id: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comprehension_score?: number
          created_at?: string
          forgetting_risk?: number
          id?: string
          intensity_score?: number
          interval_days?: number
          last_reviewed_at?: string | null
          last_studied_at?: string | null
          next_review_at?: string
          psyche_score?: number
          recommendation?: string
          status?: string
          subject_id: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comprehension_score?: number
          created_at?: string
          forgetting_risk?: number
          id?: string
          intensity_score?: number
          interval_days?: number
          last_reviewed_at?: string | null
          last_studied_at?: string | null
          next_review_at?: string
          psyche_score?: number
          recommendation?: string
          status?: string
          subject_id?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_review_schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_review_schedules_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          name: string
          order_index: number
          subject_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          name: string
          order_index?: number
          subject_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "user_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          created_at: string
          id: string
          incidence: number
          knowledge_level: number
          name: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          incidence?: number
          knowledge_level?: number
          name: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          incidence?: number
          knowledge_level?: number
          name?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_study_name: { Args: { input: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_achievement: {
        Args: { _achievement_key: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
