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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          content_id: string | null
          created_at: string
          event_type: string
          id: string
          level: string
          message: string
          metadata: Json
          platform: Database["public"]["Enums"]["social_platform"] | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          level?: string
          message: string
          metadata?: Json
          platform?: Database["public"]["Enums"]["social_platform"] | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
          platform?: Database["public"]["Enums"]["social_platform"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          input: Json
          model: string
          output: Json | null
          prompt_version: string
          provider: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          model: string
          output?: Json | null
          prompt_version: string
          provider: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          model?: string
          output?: Json | null
          prompt_version?: string
          provider?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          account_email: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          folder_id: string | null
          folder_name: string | null
          granted_scopes: string[]
          id: string
          last_error: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          folder_id?: string | null
          folder_name?: string | null
          granted_scopes?: string[]
          id?: string
          last_error?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          folder_id?: string | null
          folder_name?: string | null
          granted_scopes?: string[]
          id?: string
          last_error?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          about_me: string | null
          audience: string | null
          content_pillars: string[]
          created_at: string
          default_language: string
          default_tone: string | null
          emoji_usage: string
          favorite_cta: string | null
          formality: string
          hashtag_style: string | null
          id: string
          niche: string | null
          style_rules: string | null
          updated_at: string
          user_id: string
          words_to_avoid: string | null
          writing_style: string | null
        }
        Insert: {
          about_me?: string | null
          audience?: string | null
          content_pillars?: string[]
          created_at?: string
          default_language?: string
          default_tone?: string | null
          emoji_usage?: string
          favorite_cta?: string | null
          formality?: string
          hashtag_style?: string | null
          id?: string
          niche?: string | null
          style_rules?: string | null
          updated_at?: string
          user_id: string
          words_to_avoid?: string | null
          writing_style?: string | null
        }
        Update: {
          about_me?: string | null
          audience?: string | null
          content_pillars?: string[]
          created_at?: string
          default_language?: string
          default_tone?: string | null
          emoji_usage?: string
          favorite_cta?: string | null
          formality?: string
          hashtag_style?: string | null
          id?: string
          niche?: string | null
          style_rules?: string | null
          updated_at?: string
          user_id?: string
          words_to_avoid?: string | null
          writing_style?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          additional_instructions: string | null
          created_at: string
          deleted_at: string | null
          drive_file_id: string | null
          drive_file_name: string | null
          drive_web_view_link: string | null
          duration_seconds: number | null
          file_size: number | null
          id: string
          mime_type: string | null
          objective: string | null
          original_filename: string | null
          source: string
          status: Database["public"]["Enums"]["content_status"]
          storage_path: string | null
          target_audience: string | null
          thumbnail_path: string | null
          title: string
          tone: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_instructions?: string | null
          created_at?: string
          deleted_at?: string | null
          drive_file_id?: string | null
          drive_file_name?: string | null
          drive_web_view_link?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          objective?: string | null
          original_filename?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string | null
          target_audience?: string | null
          thumbnail_path?: string | null
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_instructions?: string | null
          created_at?: string
          deleted_at?: string | null
          drive_file_id?: string | null
          drive_file_name?: string | null
          drive_web_view_link?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          objective?: string | null
          original_filename?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_path?: string | null
          target_audience?: string | null
          thumbnail_path?: string | null
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_variants: {
        Row: {
          ai_generated: boolean
          caption: string | null
          content_id: string
          created_at: string
          cta: string | null
          description: string | null
          edited_by_user: boolean
          hashtags: string[]
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          settings: Json
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          caption?: string | null
          content_id: string
          created_at?: string
          cta?: string | null
          description?: string | null
          edited_by_user?: boolean
          hashtags?: string[]
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          settings?: Json
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          caption?: string | null
          content_id?: string
          created_at?: string
          cta?: string | null
          description?: string | null
          edited_by_user?: boolean
          hashtags?: string[]
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          settings?: Json
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_variants_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          level: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          level?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          level?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_model: string
          ai_provider: string
          avatar_url: string | null
          created_at: string
          default_cta_style: string | null
          default_language: string
          default_platforms: string[]
          default_privacy: string
          default_tone: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          ai_provider?: string
          avatar_url?: string | null
          created_at?: string
          default_cta_style?: string | null
          default_language?: string
          default_platforms?: string[]
          default_privacy?: string
          default_tone?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          ai_provider?: string
          avatar_url?: string | null
          created_at?: string
          default_cta_style?: string | null
          default_language?: string
          default_platforms?: string[]
          default_privacy?: string
          default_tone?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publishing_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          content_id: string
          created_at: string
          error_code: string | null
          error_message: string | null
          external_post_id: string | null
          external_url: string | null
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          next_attempt_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          scheduled_at: string | null
          social_account_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          content_id: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          scheduled_at?: string | null
          social_account_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          content_id?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          scheduled_at?: string | null
          social_account_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_jobs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishing_jobs_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token_encrypted: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          external_account_id: string | null
          id: string
          metadata: Json
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token_encrypted: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["account_status"]
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          metadata?: Json
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["account_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          metadata?: Json
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["account_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status: "connected" | "expired" | "error" | "disconnected"
      content_status:
        | "draft"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
      job_status:
        | "draft"
        | "scheduled"
        | "queued"
        | "uploading"
        | "processing"
        | "published"
        | "failed"
        | "cancelled"
      social_platform: "instagram" | "tiktok" | "youtube"
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
      account_status: ["connected", "expired", "error", "disconnected"],
      content_status: [
        "draft",
        "scheduled",
        "publishing",
        "published",
        "failed",
      ],
      job_status: [
        "draft",
        "scheduled",
        "queued",
        "uploading",
        "processing",
        "published",
        "failed",
        "cancelled",
      ],
      social_platform: ["instagram", "tiktok", "youtube"],
    },
  },
} as const
