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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_matricula: number
          amount: number
          created_at: string
          id: string
          invited_matricula: number
          released_at: string | null
          status: string
        }
        Insert: {
          affiliate_matricula: number
          amount?: number
          created_at?: string
          id?: string
          invited_matricula: number
          released_at?: string | null
          status?: string
        }
        Update: {
          affiliate_matricula?: number
          amount?: number
          created_at?: string
          id?: string
          invited_matricula?: number
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_matricula_fkey"
            columns: ["affiliate_matricula"]
            isOneToOne: false
            referencedRelation: "users_matricula"
            referencedColumns: ["matricula"]
          },
          {
            foreignKeyName: "affiliate_commissions_invited_matricula_fkey"
            columns: ["invited_matricula"]
            isOneToOne: true
            referencedRelation: "users_matricula"
            referencedColumns: ["matricula"]
          },
        ]
      }
      affiliate_invites: {
        Row: {
          created_at: string
          id: string
          invited_matricula: number
          inviter_matricula: number
          reviewed_at: string | null
          reviewed_by_admin: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_matricula: number
          inviter_matricula: number
          reviewed_at?: string | null
          reviewed_by_admin?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_matricula?: number
          inviter_matricula?: number
          reviewed_at?: string | null
          reviewed_by_admin?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_invites_invited_matricula_fkey"
            columns: ["invited_matricula"]
            isOneToOne: true
            referencedRelation: "users_matricula"
            referencedColumns: ["matricula"]
          },
          {
            foreignKeyName: "affiliate_invites_inviter_matricula_fkey"
            columns: ["inviter_matricula"]
            isOneToOne: false
            referencedRelation: "users_matricula"
            referencedColumns: ["matricula"]
          },
        ]
      }
      affiliate_withdrawals: {
        Row: {
          affiliate_matricula: number
          amount: number
          created_at: string
          id: string
          notes: string | null
          pix_key: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          affiliate_matricula: number
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          affiliate_matricula?: number
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          user_matricula: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          user_matricula: number
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_matricula?: number
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          times_used: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          times_used?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          times_used?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      elevenlabs_usage: {
        Row: {
          created_at: string
          id: string
          month_year: string
          tokens_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          tokens_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number | null
          deadline: string | null
          id: string
          is_active: boolean | null
          name: string
          target_amount: number
          updated_at: string
          user_matricula: number
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          target_amount: number
          updated_at?: string
          user_matricula: number
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          target_amount?: number
          updated_at?: string
          user_matricula?: number
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          paid_at: string
          payment_type: string
          scheduled_payment_id: string | null
          user_matricula: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          paid_at?: string
          payment_type?: string
          scheduled_payment_id?: string | null
          user_matricula: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          paid_at?: string
          payment_type?: string
          scheduled_payment_id?: string | null
          user_matricula?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_scheduled_payment_id_fkey"
            columns: ["scheduled_payment_id"]
            isOneToOne: false
            referencedRelation: "scheduled_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          activate_affiliate_mode: boolean | null
          admin_affiliate_link_code: string | null
          advance_amount: number | null
          advance_day: number | null
          affiliate_code: number | null
          amount: number
          cpf: string | null
          created_at: string
          credit_due_day: number | null
          credit_limit: number | null
          email: string | null
          full_name: string
          has_credit_card: boolean | null
          id: string
          matricula: number | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          payment_provider: string
          payment_status: string
          phone: string | null
          salary_amount: number | null
          salary_day: number | null
          updated_at: string
          user_temp_id: string
        }
        Insert: {
          activate_affiliate_mode?: boolean | null
          admin_affiliate_link_code?: string | null
          advance_amount?: number | null
          advance_day?: number | null
          affiliate_code?: number | null
          amount: number
          cpf?: string | null
          created_at?: string
          credit_due_day?: number | null
          credit_limit?: number | null
          email?: string | null
          full_name: string
          has_credit_card?: boolean | null
          id?: string
          matricula?: number | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payment_provider?: string
          payment_status?: string
          phone?: string | null
          salary_amount?: number | null
          salary_day?: number | null
          updated_at?: string
          user_temp_id: string
        }
        Update: {
          activate_affiliate_mode?: boolean | null
          admin_affiliate_link_code?: string | null
          advance_amount?: number | null
          advance_day?: number | null
          affiliate_code?: number | null
          amount?: number
          cpf?: string | null
          created_at?: string
          credit_due_day?: number | null
          credit_limit?: number | null
          email?: string | null
          full_name?: string
          has_credit_card?: boolean | null
          id?: string
          matricula?: number | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payment_provider?: string
          payment_status?: string
          phone?: string | null
          salary_amount?: number | null
          salary_day?: number | null
          updated_at?: string
          user_temp_id?: string
        }
        Relationships: []
      }
      salary_credits: {
        Row: {
          amount: number
          created_at: string
          credited_at: string
          id: string
          month_year: string
          user_matricula: number
        }
        Insert: {
          amount: number
          created_at?: string
          credited_at?: string
          id?: string
          month_year: string
          user_matricula: number
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string
          id?: string
          month_year?: string
          user_matricula?: number
        }
        Relationships: []
      }
      scheduled_payments: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          due_day: number
          id: string
          is_active: boolean
          is_recurring: boolean
          last_paid_at: string | null
          name: string
          specific_month: string | null
          updated_at: string
          user_matricula: number
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          due_day: number
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_paid_at?: string | null
          name: string
          specific_month?: string | null
          updated_at?: string
          user_matricula: number
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          due_day?: number
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_paid_at?: string | null
          name?: string
          specific_month?: string | null
          updated_at?: string
          user_matricula?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          sender_matricula: number | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          sender_matricula?: number | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_matricula?: number | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          closed_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_by: string | null
          status: string
          subject: string
          ticket_number: number
          updated_at: string
          user_matricula: number
        }
        Insert: {
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_by?: string | null
          status?: string
          subject: string
          ticket_number?: number
          updated_at?: string
          user_matricula: number
        }
        Update: {
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_by?: string | null
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string
          user_matricula?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          payment_method: string | null
          synced: boolean | null
          type: string
          updated_at: string
          user_matricula: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          synced?: boolean | null
          type: string
          updated_at?: string
          user_matricula: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          synced?: boolean | null
          type?: string
          updated_at?: string
          user_matricula?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users_matricula: {
        Row: {
          advance_amount: number | null
          advance_day: number | null
          affiliate_balance: number | null
          affiliate_code: string | null
          birth_date: string | null
          blocked: boolean | null
          cpf: string | null
          created_at: string
          credit_available: number | null
          credit_due_day: number | null
          credit_limit: number | null
          credit_used: number | null
          email: string | null
          full_name: string | null
          has_credit_card: boolean | null
          id: string
          initial_balance: number | null
          is_affiliate: boolean | null
          matricula: number
          payment_proof_url: string | null
          phone: string | null
          salary_amount: number | null
          salary_day: number | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_type: string | null
          trial_started_at: string | null
          trial_voice_limit_at: string | null
          user_status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          advance_amount?: number | null
          advance_day?: number | null
          affiliate_balance?: number | null
          affiliate_code?: string | null
          birth_date?: string | null
          blocked?: boolean | null
          cpf?: string | null
          created_at?: string
          credit_available?: number | null
          credit_due_day?: number | null
          credit_limit?: number | null
          credit_used?: number | null
          email?: string | null
          full_name?: string | null
          has_credit_card?: boolean | null
          id?: string
          initial_balance?: number | null
          is_affiliate?: boolean | null
          matricula: number
          payment_proof_url?: string | null
          phone?: string | null
          salary_amount?: number | null
          salary_day?: number | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          trial_started_at?: string | null
          trial_voice_limit_at?: string | null
          user_status?: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          advance_amount?: number | null
          advance_day?: number | null
          affiliate_balance?: number | null
          affiliate_code?: string | null
          birth_date?: string | null
          blocked?: boolean | null
          cpf?: string | null
          created_at?: string
          credit_available?: number | null
          credit_due_day?: number | null
          credit_limit?: number | null
          credit_used?: number | null
          email?: string | null
          full_name?: string | null
          has_credit_card?: boolean | null
          id?: string
          initial_balance?: number | null
          is_affiliate?: boolean | null
          matricula?: number
          payment_proof_url?: string | null
          phone?: string | null
          salary_amount?: number | null
          salary_day?: number | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          trial_started_at?: string | null
          trial_voice_limit_at?: string | null
          user_status?: Database["public"]["Enums"]["user_status"]
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
      app_role: "admin" | "user"
      user_status: "pending" | "approved" | "rejected"
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
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
