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
      barangays: {
        Row: {
          barangay_name: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          municipality: string
          province: string
          status: string
          updated_at: string
        }
        Insert: {
          barangay_name: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality: string
          province: string
          status?: string
          updated_at?: string
        }
        Update: {
          barangay_name?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality?: string
          province?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      battery_event_types: {
        Row: {
          created_at: string
          description: string | null
          event_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_name: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_name?: string
          id?: string
        }
        Relationships: []
      }
      battery_health_statuses: {
        Row: {
          created_at: string
          description: string | null
          health_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          health_name: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          health_name?: string
          id?: string
        }
        Relationships: []
      }
      device_battery_logs: {
        Row: {
          battery_event_type_id: string | null
          battery_health_status_id: string | null
          battery_level: number
          created_at: string
          device_id: string
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          battery_event_type_id?: string | null
          battery_health_status_id?: string | null
          battery_level: number
          created_at?: string
          device_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          battery_event_type_id?: string | null
          battery_health_status_id?: string | null
          battery_level?: number
          created_at?: string
          device_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_battery_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "ovitrap_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battery_event_type"
            columns: ["battery_event_type_id"]
            isOneToOne: false
            referencedRelation: "battery_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battery_health_status"
            columns: ["battery_health_status_id"]
            isOneToOne: false
            referencedRelation: "battery_health_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_battery_recorded_by"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_maintenance: {
        Row: {
          actions_taken: string | null
          created_at: string
          device_id: string
          findings: string | null
          id: string
          maintenance_status_id: string
          maintenance_type_id: string
          next_maintenance_date: string | null
          performed_at: string | null
          performed_by: string | null
          remarks: string | null
          scheduled_date: string | null
          updated_at: string
        }
        Insert: {
          actions_taken?: string | null
          created_at?: string
          device_id: string
          findings?: string | null
          id?: string
          maintenance_status_id: string
          maintenance_type_id: string
          next_maintenance_date?: string | null
          performed_at?: string | null
          performed_by?: string | null
          remarks?: string | null
          scheduled_date?: string | null
          updated_at?: string
        }
        Update: {
          actions_taken?: string | null
          created_at?: string
          device_id?: string
          findings?: string | null
          id?: string
          maintenance_status_id?: string
          maintenance_type_id?: string
          next_maintenance_date?: string | null
          performed_at?: string | null
          performed_by?: string | null
          remarks?: string | null
          scheduled_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dm_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "ovitrap_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_performed_by"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_status"
            columns: ["maintenance_status_id"]
            isOneToOne: false
            referencedRelation: "maintenance_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dm_type"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
        ]
      }
      device_responsibilities: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          device_id: string
          ended_at: string | null
          id: string
          is_active: boolean
          remarks: string | null
          responsible_profile_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          device_id: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          remarks?: string | null
          responsible_profile_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          device_id?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          remarks?: string | null
          responsible_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dr_assigned_by"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dr_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "ovitrap_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dr_profile"
            columns: ["responsible_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status_name?: string
        }
        Relationships: []
      }
      maintenance_statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status_name?: string
        }
        Relationships: []
      }
      maintenance_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          maintenance_type_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          maintenance_type_name?: string
        }
        Relationships: []
      }
      notification_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          type_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          type_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          type_name?: string
        }
        Relationships: []
      }
      ovitrap_devices: {
        Row: {
          barangay_id: string
          created_at: string
          device_code: string
          device_status_id: string
          firmware_version: string | null
          id: string
          installation_date: string
          last_seen_at: string | null
          latitude: number
          longitude: number
          notes: string | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          barangay_id: string
          created_at?: string
          device_code: string
          device_status_id: string
          firmware_version?: string | null
          id?: string
          installation_date: string
          last_seen_at?: string | null
          latitude: number
          longitude: number
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          barangay_id?: string
          created_at?: string
          device_code?: string
          device_status_id?: string
          firmware_version?: string | null
          id?: string
          installation_date?: string
          last_seen_at?: string | null
          latitude?: number
          longitude?: number
          notes?: string | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_device_barangay"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_device_status"
            columns: ["device_status_id"]
            isOneToOne: false
            referencedRelation: "device_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      ovitrap_readings: {
        Row: {
          ai_confidence: number | null
          battery_level: number | null
          captured_at: string
          created_at: string
          device_id: string
          egg_count: number
          humidity_percent: number | null
          id: string
          image_path: string | null
          temperature_c: number | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          battery_level?: number | null
          captured_at?: string
          created_at?: string
          device_id: string
          egg_count: number
          humidity_percent?: number | null
          id?: string
          image_path?: string | null
          temperature_c?: number | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          battery_level?: number | null
          captured_at?: string
          created_at?: string
          device_id?: string
          egg_count?: number
          humidity_percent?: number | null
          id?: string
          image_path?: string | null
          temperature_c?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_readings_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "ovitrap_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          barangay_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          middle_name: string | null
          phone_number: string | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          barangay_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          middle_name?: string | null
          phone_number?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          barangay_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          middle_name?: string | null
          phone_number?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_barangay"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_role"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          assessed_by: string | null
          assessment_notes: string | null
          assessment_period_end: string
          assessment_period_start: string
          barangay_id: string
          calculated_score: number
          created_at: string
          id: string
          risk_level_id: string
          risk_model_id: string
          updated_at: string
        }
        Insert: {
          assessed_by?: string | null
          assessment_notes?: string | null
          assessment_period_end: string
          assessment_period_start: string
          barangay_id: string
          calculated_score: number
          created_at?: string
          id?: string
          risk_level_id: string
          risk_model_id: string
          updated_at?: string
        }
        Update: {
          assessed_by?: string | null
          assessment_notes?: string | null
          assessment_period_end?: string
          assessment_period_start?: string
          barangay_id?: string
          calculated_score?: number
          created_at?: string
          id?: string
          risk_level_id?: string
          risk_model_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ra_assessed_by"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ra_barangay"
            columns: ["barangay_id"]
            isOneToOne: false
            referencedRelation: "barangays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ra_level"
            columns: ["risk_level_id"]
            isOneToOne: false
            referencedRelation: "risk_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ra_model"
            columns: ["risk_model_id"]
            isOneToOne: false
            referencedRelation: "risk_models"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_levels: {
        Row: {
          created_at: string
          description: string | null
          display_color: string
          id: string
          is_active: boolean
          level_name: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_color: string
          id?: string
          is_active?: boolean
          level_name: string
          priority: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_color?: string
          id?: string
          is_active?: boolean
          level_name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      risk_model_thresholds: {
        Row: {
          created_at: string
          id: string
          maximum_score: number
          minimum_score: number
          risk_level_id: string
          risk_model_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          maximum_score: number
          minimum_score: number
          risk_level_id: string
          risk_model_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          maximum_score?: number
          minimum_score?: number
          risk_level_id?: string
          risk_model_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_threshold_level"
            columns: ["risk_level_id"]
            isOneToOne: false
            referencedRelation: "risk_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_threshold_model"
            columns: ["risk_model_id"]
            isOneToOne: false
            referencedRelation: "risk_models"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_models: {
        Row: {
          classification_method: string
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          major_version: number
          minor_version: number
          model_name: string
          updated_at: string
        }
        Insert: {
          classification_method: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          major_version: number
          minor_version: number
          model_name: string
          updated_at?: string
        }
        Update: {
          classification_method?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          major_version?: number
          minor_version?: number
          model_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_risk_model_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          role_code: string
          role_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          role_code: string
          role_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          role_code?: string
          role_name?: string
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
