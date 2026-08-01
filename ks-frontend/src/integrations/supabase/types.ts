// Database types for the Kendry & Slate schema (`ks`) in the Rose Supabase
// project. Derived from the pre-merge generated file, with:
//   · the schema key renamed public -> ks
//   · `performed_by` added to the tables that now carry an operator stamp
//   · the app_role enum and user_roles table dropped (admin is now Rose's
//     public.user_profiles.is_admin)
//
// The Relationships blocks matter more than they look: supabase-js uses their
// isOneToOne flags to decide whether an embedded select returns an object or
// an array. Without them every join infers as an array and ~24 call sites
// stop compiling. Regenerate with:
//   supabase gen types typescript --project-id vmdswdlkaxlklgvsvuqi --schema ks

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
    PostgrestVersion: "13.0.4"
  }
  public: {
    // Minimal view of Rose's own schema — only what K&S actually reads.
    // Rose owns the full definition; this exists so `.schema('public')`
    // typechecks from a client whose default schema is `ks`.
    Tables: {
      user_profiles: {
        Row: {
          user_id: string
          display_name: string | null
          is_admin: boolean | null
        }
        Insert: {
          user_id: string
          display_name?: string | null
          is_admin?: boolean | null
        }
        Update: {
          user_id?: string
          display_name?: string | null
          is_admin?: boolean | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
  ks: {
    Tables: {
      calendar_events: {
        Row: {
          performed_by: string | null
          attendees: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          matter_id: string | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          performed_by?: string | null
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          matter_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          performed_by?: string | null
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          matter_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          performed_by: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          matter_id: string
          task_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          performed_by?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          matter_id: string
          task_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          performed_by?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          matter_id?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_matter_id"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          access_level: string | null
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_projects: {
        Row: {
          matter_id: string
          project_id: string
          auto_created: boolean
          group_id: string | null
          created_at: string
        }
        Insert: {
          matter_id: string
          project_id: string
          auto_created?: boolean
          group_id?: string | null
          created_at?: string
        }
        Update: {
          matter_id?: string
          project_id?: string
          auto_created?: boolean
          group_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_projects_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      matters: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          fee_type: string | null
          fixed_fee: number | null
          hourly_rate: number | null
          id: string
          lead_partner_id: string | null
          matter_type: string | null
          shared_teaching: boolean
          start_date: string | null
          status: string | null
          title: string
          total_fees: number | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee_type?: string | null
          fixed_fee?: number | null
          hourly_rate?: number | null
          id?: string
          lead_partner_id?: string | null
          matter_type?: string | null
          shared_teaching?: boolean
          start_date?: string | null
          status?: string | null
          title: string
          total_fees?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee_type?: string | null
          fixed_fee?: number | null
          hourly_rate?: number | null
          id?: string
          lead_partner_id?: string | null
          matter_type?: string | null
          shared_teaching?: boolean
          start_date?: string | null
          status?: string | null
          title?: string
          total_fees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_matters_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_lead_partner_id_fkey"
            columns: ["lead_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link_url: string | null
          message: string
          read: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_url?: string | null
          message: string
          read?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string
          read?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cost_rate: number | null
          created_at: string | null
          email: string
          full_name: string | null
          hourly_rate: number | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cost_rate?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cost_rate?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          performed_by: string | null
          actual_hours: number
          created_at: string
          estimated_hours: number
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          performed_by?: string | null
          actual_hours?: number
          created_at?: string
          estimated_hours?: number
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          performed_by?: string | null
          actual_hours?: number
          created_at?: string
          estimated_hours?: number
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_assignments_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_assignments_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          performed_by: string | null
          actual_hours: number | null
          assigned_to: string | null
          commencement_date: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_total_hours: number | null
          id: string
          matter_id: string
          order_position: number
          phase: string | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          workstream: string | null
        }
        Insert: {
          performed_by?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          commencement_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_total_hours?: number | null
          id?: string
          matter_id: string
          order_position?: number
          phase?: string | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workstream?: string | null
        }
        Update: {
          performed_by?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          commencement_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_total_hours?: number | null
          id?: string
          matter_id?: string
          order_position?: number
          phase?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workstream?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_matter_id"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          performed_by: string | null
          billable: boolean | null
          created_at: string | null
          date: string
          description: string
          hourly_rate: number | null
          hours: number
          id: string
          matter_id: string
          source: string
          task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          performed_by?: string | null
          billable?: boolean | null
          created_at?: string | null
          date: string
          description: string
          hourly_rate?: number | null
          hours: number
          id?: string
          matter_id: string
          source?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          performed_by?: string | null
          billable?: boolean | null
          created_at?: string | null
          date?: string
          description?: string
          hourly_rate?: number | null
          hours?: number
          id?: string
          matter_id?: string
          source?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_matter_id"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      matter_time_ledger: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string | null
          description: string | null
          entry_id: string | null
          hourly_rate: number | null
          hours: number | null
          lawyer_name: string | null
          matter_id: string | null
          matter_title: string | null
          phase: string | null
          source: string | null
          task_id: string | null
          task_title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_matter_id"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_read_matter: {
        Args: { m_id: string }
        Returns: boolean
      }
      can_write_matter: {
        Args: { m_id: string }
        Returns: boolean
      }
      operator_name: {
        Args: { p_user: string }
        Returns: string
      }
      recompute: {
        Args: { task_ids: string[] | null; matter_ids: string[] | null }
        Returns: undefined
      }
      add_business_days: {
        Args: { days_to_add: number; start_date: string }
        Returns: string
      }
      business_days_between: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      calculate_matter_fees: { Args: { matter_uuid: string }; Returns: number }
      calculate_monthly_financial_metrics: {
        Args: { target_month?: number; target_year?: number }
        Returns: {
          month_year: string
          total_costs: number
          total_estimated_costs: number
          total_estimated_revenue: number
          total_revenue: number
        }[]
      }
      calculate_monthly_utilization: {
        Args: { target_month: number; target_year: number; user_uuid: string }
        Returns: {
          actual_hours: number
          actual_utilization: number
          projected_hours: number
          projected_revenue: number
          projected_utilization: number
          target_hours: number
        }[]
      }
      calculate_task_actual_hours: {
        Args: { task_uuid: string }
        Returns: number
      }
      calculate_task_estimated_hours: {
        Args: { task_uuid: string }
        Returns: number
      }
      create_adjustment_time_entries: { Args: never; Returns: undefined }
      get_current_user_role: { Args: never; Returns: string }
      get_monthly_financial_report: {
        Args: { months_back?: number }
        Returns: {
          month_year: string
          total_costs: number
          total_estimated_costs: number
          total_estimated_revenue: number
          total_revenue: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["ks"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_all_matter_dates: { Args: never; Returns: undefined }
      sync_task_assignment_hours_to_time_entries: {
        Args: never
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "partner"
        | "senior_associate"
        | "associate"
        | "paralegal"
        | "staff"
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
  ks: {
    Enums: {
      app_role: [
        "admin",
        "partner",
        "senior_associate",
        "associate",
        "paralegal",
        "staff",
      ],
    },
  },
} as const
