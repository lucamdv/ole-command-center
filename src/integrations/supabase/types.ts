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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_findings: {
        Row: {
          apolice: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          detalhes: Json
          endosso: string | null
          id: string
          run_id: string
          tipo_erro: string
        }
        Insert: {
          apolice: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          detalhes: Json
          endosso?: string | null
          id?: string
          run_id: string
          tipo_erro: string
        }
        Update: {
          apolice?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          detalhes?: Json
          endosso?: string | null
          id?: string
          run_id?: string
          tipo_erro?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_ignores: {
        Row: {
          apolice: string
          created_at: string
          id: string
          motivo: string | null
          scope: string
          tipo_erro: string | null
          user_id: string
        }
        Insert: {
          apolice: string
          created_at?: string
          id?: string
          motivo?: string | null
          scope: string
          tipo_erro?: string | null
          user_id: string
        }
        Update: {
          apolice?: string
          created_at?: string
          id?: string
          motivo?: string | null
          scope?: string
          tipo_erro?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_runs: {
        Row: {
          aprovados: number
          created_at: string
          data_auditoria: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          mensagem_geral: string | null
          raw: Json | null
          reprovados: number
          status: string
          status_geral: string | null
          total_processado: number
        }
        Insert: {
          aprovados?: number
          created_at?: string
          data_auditoria?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          mensagem_geral?: string | null
          raw?: Json | null
          reprovados?: number
          status: string
          status_geral?: string | null
          total_processado?: number
        }
        Update: {
          aprovados?: number
          created_at?: string
          data_auditoria?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          mensagem_geral?: string | null
          raw?: Json | null
          reprovados?: number
          status?: string
          status_geral?: string | null
          total_processado?: number
        }
        Relationships: []
      }
      calendar_activities: {
        Row: {
          all_day: boolean
          category: string | null
          client: string | null
          color: string | null
          completed_at: string | null
          created_at: string
          description: Json
          end_at: string
          id: string
          parent_activity_id: string | null
          priority: string
          project: string | null
          recurrence_count: number | null
          recurrence_rule: string | null
          recurrence_until: string | null
          series_exception: Json | null
          start_at: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          category?: string | null
          client?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: Json
          end_at: string
          id?: string
          parent_activity_id?: string | null
          priority?: string
          project?: string | null
          recurrence_count?: number | null
          recurrence_rule?: string | null
          recurrence_until?: string | null
          series_exception?: Json | null
          start_at: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          category?: string | null
          client?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          description?: Json
          end_at?: string
          id?: string
          parent_activity_id?: string | null
          priority?: string
          project?: string | null
          recurrence_count?: number | null
          recurrence_rule?: string | null
          recurrence_until?: string | null
          series_exception?: Json | null
          start_at?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_activities_parent_activity_id_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "calendar_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_attachments: {
        Row: {
          activity_id: string
          created_at: string
          external_url: string | null
          file_name: string
          file_path: string | null
          id: string
          is_link: boolean
          mime_type: string | null
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          external_url?: string | null
          file_name: string
          file_path?: string | null
          id?: string
          is_link?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          external_url?: string | null
          file_name?: string
          file_path?: string | null
          id?: string
          is_link?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "calendar_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_notifications: {
        Row: {
          activity_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "calendar_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_reminders: {
        Row: {
          activity_id: string
          channels: string[]
          created_at: string
          id: string
          next_trigger_at: string
          offset_minutes: number
          sent_at: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          channels?: string[]
          created_at?: string
          id?: string
          next_trigger_at: string
          offset_minutes?: number
          sent_at?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          channels?: string[]
          created_at?: string
          id?: string
          next_trigger_at?: string
          offset_minutes?: number
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_reminders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "calendar_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_favorite: boolean
          name: string
          updated_at: string
          user_id: string
          view_mode: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          name: string
          updated_at?: string
          user_id: string
          view_mode?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          view_mode?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          created_at: string
          id: string
          numero_apolice: string
          numero_endosso: string
          ordem: number
          policy_id: string
          premio_liquido: number | null
          proposta: Json
        }
        Insert: {
          created_at?: string
          id?: string
          numero_apolice: string
          numero_endosso: string
          ordem?: number
          policy_id: string
          premio_liquido?: number | null
          proposta?: Json
        }
        Update: {
          created_at?: string
          id?: string
          numero_apolice?: string
          numero_endosso?: string
          ordem?: number
          policy_id?: string
          premio_liquido?: number | null
          proposta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      oliver_knowledge: {
        Row: {
          content: string
          embedding: string
          id: string
          kind: string
          metadata: Json
          ref_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          embedding: string
          id?: string
          kind: string
          metadata?: Json
          ref_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          embedding?: string
          id?: string
          kind?: string
          metadata?: Json
          ref_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      oliver_memory: {
        Row: {
          content: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      oliver_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oliver_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "oliver_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      oliver_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          id: string
          last_sync_run_id: string | null
          numero_apolice: string
          numero_endosso_atual: string | null
          premio_liquido: number | null
          proposta: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_run_id?: string | null
          numero_apolice: string
          numero_endosso_atual?: string | null
          premio_liquido?: number | null
          proposta?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_run_id?: string | null
          numero_apolice?: string
          numero_endosso_atual?: string | null
          premio_liquido?: number | null
          proposta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_last_sync_run_id_fkey"
            columns: ["last_sync_run_id"]
            isOneToOne: false
            referencedRelation: "policy_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_sync_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          raw: Json | null
          status: string
          total_apolices: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw?: Json | null
          status?: string
          total_apolices?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw?: Json | null
          status?: string
          total_apolices?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_oliver_knowledge: {
        Args: {
          kind_filter?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          kind: string
          metadata: Json
          ref_id: string
          similarity: number
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
