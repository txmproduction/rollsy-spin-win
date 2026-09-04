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
      clients: {
        Row: {
          consent_at: string | null
          consent_ip: string | null
          created_at: string
          email: string | null
          id: string
          marketing_consent: boolean
          merchant_id: string | null
          name: string | null
          phone: string | null
          terms_accepted: boolean
        }
        Insert: {
          consent_at?: string | null
          consent_ip?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          merchant_id?: string | null
          name?: string | null
          phone?: string | null
          terms_accepted?: boolean
        }
        Update: {
          consent_at?: string | null
          consent_ip?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          merchant_id?: string | null
          name?: string | null
          phone?: string | null
          terms_accepted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clients_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          cgv_accepted_at: string | null
          company_name: string
          created_at: string
          email: string
          first_name: string | null
          goal_type: string
          goal_url: string | null
          id: string
          last_name: string | null
          logo_path: string | null
          onboarding_completed: boolean
          owner_id: string | null
          phone: string | null
          reward_mode: string
          slug: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          cgv_accepted_at?: string | null
          company_name: string
          created_at?: string
          email: string
          first_name?: string | null
          goal_type?: string
          goal_url?: string | null
          id?: string
          last_name?: string | null
          logo_path?: string | null
          onboarding_completed?: boolean
          owner_id?: string | null
          phone?: string | null
          reward_mode?: string
          slug: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          cgv_accepted_at?: string | null
          company_name?: string
          created_at?: string
          email?: string
          first_name?: string | null
          goal_type?: string
          goal_url?: string | null
          id?: string
          last_name?: string | null
          logo_path?: string | null
          onboarding_completed?: boolean
          owner_id?: string | null
          phone?: string | null
          reward_mode?: string
          slug?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          active: boolean
          created_at: string
          frequency: string
          id: string
          merchant_id: string | null
          name: string
          quota: number
          quota_afternoon: number | null
          quota_morning: number | null
          short_label: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          frequency: string
          id?: string
          merchant_id?: string | null
          name: string
          quota?: number
          quota_afternoon?: number | null
          quota_morning?: number | null
          short_label?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          frequency?: string
          id?: string
          merchant_id?: string | null
          name?: string
          quota?: number
          quota_afternoon?: number | null
          quota_morning?: number | null
          short_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      spins: {
        Row: {
          client_id: string | null
          code: string | null
          code_used: boolean
          created_at: string
          id: string
          merchant_id: string | null
          result: string
          reward_id: string | null
        }
        Insert: {
          client_id?: string | null
          code?: string | null
          code_used?: boolean
          created_at?: string
          id?: string
          merchant_id?: string | null
          result: string
          reward_id?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string | null
          code_used?: boolean
          created_at?: string
          id?: string
          merchant_id?: string | null
          result?: string
          reward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spins_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spins_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
