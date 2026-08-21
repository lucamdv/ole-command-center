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
          created_by: string | null
          id: string
          motivo: string | null
          reason_tag_id: string | null
          scope: string
          tipo_erro: string | null
        }
        Insert: {
          apolice: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          reason_tag_id?: string | null
          scope: string
          tipo_erro?: string | null
        }
        Update: {
          apolice?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          reason_tag_id?: string | null
          scope?: string
          tipo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_ignores_reason_tag_id_fkey"
            columns: ["reason_tag_id"]
            isOneToOne: false
            referencedRelation: "exception_reason_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_resolutions: {
        Row: {
          apolice: string
          created_at: string
          endosso: string | null
          first_seen_at: string | null
          id: string
          motivo: string | null
          origem: string
          reopened_at: string | null
          resolved_at: string
          resolved_by: string | null
          run_id: string | null
          tipo_erro: string
          updated_at: string
        }
        Insert: {
          apolice: string
          created_at?: string
          endosso?: string | null
          first_seen_at?: string | null
          id?: string
          motivo?: string | null
          origem?: string
          reopened_at?: string | null
          resolved_at?: string
          resolved_by?: string | null
          run_id?: string | null
          tipo_erro: string
          updated_at?: string
        }
        Update: {
          apolice?: string
          created_at?: string
          endosso?: string | null
          first_seen_at?: string | null
          id?: string
          motivo?: string | null
          origem?: string
          reopened_at?: string | null
          resolved_at?: string
          resolved_by?: string | null
          run_id?: string | null
          tipo_erro?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_resolutions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
            referencedColumns: ["id"]
          },
        ]
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
          origem: string
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
          origem?: string
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
          origem?: string
          raw?: Json | null
          reprovados?: number
          status?: string
          status_geral?: string | null
          total_processado?: number
        }
        Relationships: []
      }
      automation_schedules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          job: string
          last_error: string | null
          last_status: string | null
          last_triggered_at: string | null
          run_at_time: string
          timezone: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          job: string
          last_error?: string | null
          last_status?: string | null
          last_triggered_at?: string | null
          run_at_time?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          job?: string
          last_error?: string | null
          last_status?: string | null
          last_triggered_at?: string | null
          run_at_time?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      endorsement_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          policy_number: string
          reason_tag_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          policy_number: string
          reason_tag_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          policy_number?: string
          reason_tag_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_exceptions_reason_tag_id_fkey"
            columns: ["reason_tag_id"]
            isOneToOne: false
            referencedRelation: "exception_reason_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_extraction_items: {
        Row: {
          created_at: string
          id: string
          last_sequencial_endosso_used: number | null
          policy_number: string
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sequencial_endosso_used?: number | null
          policy_number: string
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sequencial_endosso_used?: number | null
          policy_number?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_extraction_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "endorsement_extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_extraction_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          raw: Json | null
          status: string
          total_apolices: number
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      exception_reason_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
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
      policy_billing: {
        Row: {
          created_at: string
          data_quitacao: string | null
          data_vencimento: string | null
          id: string
          numero_apolice: string
          numero_endosso: string
          numero_proposta: string | null
          situacao_emissao: string
          status_pagamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_quitacao?: string | null
          data_vencimento?: string | null
          id?: string
          numero_apolice: string
          numero_endosso: string
          numero_proposta?: string | null
          situacao_emissao: string
          status_pagamento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_quitacao?: string | null
          data_vencimento?: string | null
          id?: string
          numero_apolice?: string
          numero_endosso?: string
          numero_proposta?: string | null
          situacao_emissao?: string
          status_pagamento?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_sync_runs: {
        Row: {
          cobrancas_finished_at: string | null
          cobrancas_status: string
          cobrancas_total: number
          created_at: string
          duration_ms: number | null
          emissoes_finished_at: string | null
          emissoes_status: string
          error_message: string | null
          finished_at: string | null
          id: string
          raw: Json | null
          status: string
          total_apolices: number
        }
        Insert: {
          cobrancas_finished_at?: string | null
          cobrancas_status?: string
          cobrancas_total?: number
          created_at?: string
          duration_ms?: number | null
          emissoes_finished_at?: string | null
          emissoes_status?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw?: Json | null
          status?: string
          total_apolices?: number
        }
        Update: {
          cobrancas_finished_at?: string | null
          cobrancas_status?: string
          cobrancas_total?: number
          created_at?: string
          duration_ms?: number | null
          emissoes_finished_at?: string | null
          emissoes_status?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw?: Json | null
          status?: string
          total_apolices?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
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
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
