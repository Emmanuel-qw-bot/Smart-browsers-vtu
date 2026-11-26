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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      site_announcements: {
        Row: { id: string; title: string; message: string; published: boolean; starts_at: string | null; ends_at: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; message: string; published?: boolean; starts_at?: string | null; ends_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; message?: string; published?: boolean; starts_at?: string | null; ends_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      support_settings: {
        Row: {
          id: boolean
          phone: string
          whatsapp_number: string
          support_email: string
          whatsapp_group_url: string
          support_hours: string
          phone_enabled: boolean
          whatsapp_enabled: boolean
          email_enabled: boolean
          group_enabled: boolean
          floating_button_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          phone?: string
          whatsapp_number?: string
          support_email?: string
          whatsapp_group_url?: string
          support_hours?: string
          phone_enabled?: boolean
          whatsapp_enabled?: boolean
          email_enabled?: boolean
          group_enabled?: boolean
          floating_button_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          phone?: string
          whatsapp_number?: string
          support_email?: string
          whatsapp_group_url?: string
          support_hours?: string
          phone_enabled?: boolean
          whatsapp_enabled?: boolean
          email_enabled?: boolean
          group_enabled?: boolean
          floating_button_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          username: string
          id: string
          invite_code: string
          phone: string
          phone_verified: boolean
          referred_by: string | null
          registration_source: Database["public"]["Enums"]["registration_source"]
          registration_source_other: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          full_name: string
          username: string
          id: string
          invite_code: string
          phone: string
          phone_verified?: boolean
          referred_by?: string | null
          registration_source?: Database["public"]["Enums"]["registration_source"]
          registration_source_other?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string
          username?: string
          id?: string
          invite_code?: string
          phone?: string
          phone_verified?: boolean
          referred_by?: string | null
          registration_source?: Database["public"]["Enums"]["registration_source"]
          registration_source_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      vtu_configuration_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      vtu_products: {
        Row: {
          active: boolean
          archived: boolean
          cost_kobo: number | null
          created_at: string
          data_plan_id: number | null
          id: string
          markup_percent: number
          max_amount_kobo: number | null
          min_amount_kobo: number | null
          network_id: number
          network_name: string
          plan_name: string
          plan_type: string | null
          provider_id: string
          selling_price_kobo: number | null
          service: string
          validity: string | null
        }
        Insert: {
          active?: boolean
          archived?: boolean
          cost_kobo?: number | null
          created_at?: string
          data_plan_id?: number | null
          id?: string
          markup_percent?: number
          max_amount_kobo?: number | null
          min_amount_kobo?: number | null
          network_id: number
          network_name: string
          plan_name: string
          plan_type?: string | null
          provider_id: string
          selling_price_kobo?: number | null
          service: string
          validity?: string | null
        }
        Update: {
          active?: boolean
          archived?: boolean
          cost_kobo?: number | null
          created_at?: string
          data_plan_id?: number | null
          id?: string
          markup_percent?: number
          max_amount_kobo?: number | null
          min_amount_kobo?: number | null
          network_id?: number
          network_name?: string
          plan_name?: string
          plan_type?: string | null
          provider_id?: string
          selling_price_kobo?: number | null
          service?: string
          validity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vtu_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "vtu_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_giveaway_slots: {
        Row: { id: string; campaign_key: string; slot_number: number; user_id: string | null; status: "available" | "claimed"; claimed_at: string | null }
        Insert: { id?: string; campaign_key: string; slot_number: number; user_id?: string | null; status?: "available" | "claimed"; claimed_at?: string | null }
        Update: { id?: string; campaign_key?: string; slot_number?: number; user_id?: string | null; status?: "available" | "claimed"; claimed_at?: string | null }
        Relationships: []
      }
      weekend_giveaway_eligibility: {
        Row: { campaign_key: string; user_id: string; successful_data_purchases: number; verified_at: string }
        Insert: { campaign_key: string; user_id: string; successful_data_purchases?: number; verified_at?: string }
        Update: { campaign_key?: string; user_id?: string; successful_data_purchases?: number; verified_at?: string }
        Relationships: []
      }
      weekend_giveaway_claim_details: {
        Row: { id: string; campaign_key: string; user_id: string; slot_id: string; network: string | null; recipient_phone: string | null; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; campaign_key: string; user_id: string; slot_id: string; network?: string | null; recipient_phone?: string | null; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; campaign_key?: string; user_id?: string; slot_id?: string; network?: string | null; recipient_phone?: string | null; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      weekend_giveaway_settings: {
        Row: { id: boolean; enabled: boolean; announcement: string; reward_data_mb: number; minimum_data_purchases: number; maximum_winners: number; opens_at: string | null; closes_at: string | null; updated_at: string; updated_by: string | null }
        Insert: { id?: boolean; enabled?: boolean; announcement?: string; reward_data_mb?: number; minimum_data_purchases?: number; maximum_winners?: number; opens_at?: string | null; closes_at?: string | null; updated_at?: string; updated_by?: string | null }
        Update: { id?: boolean; enabled?: boolean; announcement?: string; reward_data_mb?: number; minimum_data_purchases?: number; maximum_winners?: number; opens_at?: string | null; closes_at?: string | null; updated_at?: string; updated_by?: string | null }
        Relationships: []
      }
      weekend_giveaway_applications: {
        Row: { id: string; campaign_key: string; user_id: string; status: "submitted" | "selected" | "not_selected" | "cancelled"; applied_at: string }
        Insert: { id?: string; campaign_key: string; user_id: string; status?: "submitted" | "selected" | "not_selected" | "cancelled"; applied_at?: string }
        Update: { id?: string; campaign_key?: string; user_id?: string; status?: "submitted" | "selected" | "not_selected" | "cancelled"; applied_at?: string }
        Relationships: []
      }
      vtu_providers: {
        Row: {
          adapter: string
          airtime_enabled: boolean
          connection_status: string
          created_at: string
          data_enabled: boolean
          enabled: boolean
          id: string
          last_authenticated_at: string | null
          last_checked_at: string | null
          last_error: string | null
          name: string
        }
        Insert: {
          adapter: string
          airtime_enabled?: boolean
          connection_status?: string
          created_at?: string
          data_enabled?: boolean
          enabled?: boolean
          id?: string
          last_authenticated_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          name: string
        }
        Update: {
          adapter?: string
          airtime_enabled?: boolean
          connection_status?: string
          created_at?: string
          data_enabled?: boolean
          enabled?: boolean
          id?: string
          last_authenticated_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_kobo: number
          balance_after_kobo: number
          category: Database["public"]["Enums"]["wallet_txn_category"]
          created_at: string
          description: string
          id: string
          reference: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          balance_after_kobo: number
          category: Database["public"]["Enums"]["wallet_txn_category"]
          created_at?: string
          description: string
          id?: string
          reference: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          balance_after_kobo?: number
          category?: Database["public"]["Enums"]["wallet_txn_category"]
          created_at?: string
          description?: string
          id?: string
          reference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_kobo: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_kobo?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_kobo?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vtu_purchase_attempts: {
        Row: {
          reference: string
          request_id: string | null
          user_id: string
          service: "data" | "airtime"
          provider: "arewabundle" | "bigisub"
          product_id: string | null
          network_name: string
          phone: string
          amount_kobo: number
          status: "initiated" | "debit_failed" | "debited" | "pending" | "uncertain" | "successful" | "refunded" | "refund_failed"
          provider_reference: string | null
          provider_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          reference: string
          request_id?: string | null
          user_id: string
          service: "data" | "airtime"
          provider: "arewabundle" | "bigisub"
          product_id?: string | null
          network_name: string
          phone: string
          amount_kobo: number
          status?: "initiated" | "debit_failed" | "debited" | "pending" | "uncertain" | "successful" | "refunded" | "refund_failed"
          provider_reference?: string | null
          provider_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          reference?: string
          request_id?: string | null
          user_id?: string
          service?: "data" | "airtime"
          provider?: "arewabundle" | "bigisub"
          product_id?: string | null
          network_name?: string
          phone?: string
          amount_kobo?: number
          status?: "initiated" | "debit_failed" | "debited" | "pending" | "uncertain" | "successful" | "refunded" | "refund_failed"
          provider_reference?: string | null
          provider_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "vtu_purchase_attempts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "vtu_purchase_attempts_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "vtu_products"; referencedColumns: ["id"] }
        ]
      }
      welcome_bonus_settings: {
        Row: {
          amount_kobo: number
          enabled: boolean
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_kobo?: number
          enabled?: boolean
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_kobo?: number
          enabled?: boolean
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      weekend_rush_claim_slot: { Args: Record<PropertyKey, never>; Returns: Json }
      weekend_rush_save_recipient: { Args: { _network: string; _phone: string }; Returns: Json }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_code_is_valid: { Args: { _code: string }; Returns: boolean }
      registration_conflicts: {
        Args: { _email: string; _phone: string; _username: string }
        Returns: Json
      }
      wallet_post: {
        Args: {
          _amount_kobo: number
          _category: Database["public"]["Enums"]["wallet_txn_category"]
          _description: string
          _reference: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      registration_source:
        | "friends"
        | "whatsapp"
        | "facebook"
        | "instagram"
        | "tiktok"
        | "google_search"
        | "other"
      wallet_txn_category:
        | "deposit"
        | "promotional"
        | "reward"
        | "purchase"
        | "refund"
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
    Enums: {
      app_role: ["admin", "customer"],
      registration_source: [
        "friends",
        "whatsapp",
        "facebook",
        "instagram",
        "tiktok",
        "google_search",
        "other",
      ],
      wallet_txn_category: [
        "deposit",
        "promotional",
        "reward",
        "purchase",
        "refund",
      ],
    },
  },
} as const
