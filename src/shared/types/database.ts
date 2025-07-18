export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      communities: {
        Row: {
          banner_image_url: string | null
          boundary: Json | null
          boundary_geometry: unknown | null
          center: unknown
          center_name: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          member_count: number
          name: string
          organizer_id: string
          time_zone: string
          type: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          boundary?: Json | null
          boundary_geometry?: unknown | null
          center: unknown
          center_name?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number
          name: string
          organizer_id: string
          time_zone: string
          type?: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          boundary?: Json | null
          boundary_geometry?: unknown | null
          center?: unknown
          center_name?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number
          name?: string
          organizer_id?: string
          time_zone?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_memberships: {
        Row: {
          community_id: string
          created_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_memberships_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          last_activity_at: string
          last_message_id: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_activity_at?: string
          last_message_id?: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_activity_at?: string
          last_message_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          from_user_id: string
          id: string
          read_at: string | null
          to_user_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          from_user_id: string
          id?: string
          read_at?: string | null
          to_user_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          from_user_id?: string
          id?: string
          read_at?: string | null
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gathering_responses: {
        Row: {
          created_at: string
          gathering_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gathering_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gathering_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gathering_responses_gathering_id_fkey"
            columns: ["gathering_id"]
            isOneToOne: false
            referencedRelation: "gatherings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gatherings: {
        Row: {
          attendee_count: number
          community_id: string
          coordinates: unknown
          created_at: string
          description: string
          end_date_time: string | null
          id: string
          image_urls: string[]
          location_name: string
          max_attendees: number | null
          organizer_id: string
          start_date_time: string
          title: string
          updated_at: string
        }
        Insert: {
          attendee_count?: number
          community_id: string
          coordinates: unknown
          created_at?: string
          description: string
          end_date_time?: string | null
          id?: string
          image_urls?: string[]
          location_name: string
          max_attendees?: number | null
          organizer_id: string
          start_date_time: string
          title: string
          updated_at?: string
        }
        Update: {
          attendee_count?: number
          community_id?: string
          coordinates?: unknown
          created_at?: string
          description?: string
          end_date_time?: string | null
          id?: string
          image_urls?: string[]
          location_name?: string
          max_attendees?: number | null
          organizer_id?: string
          start_date_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gatherings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gatherings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          user_metadata: Json
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
          user_metadata: Json
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          user_metadata?: Json
        }
        Relationships: []
      }
      resource_claims: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          status: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          status?: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          status?: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_claims_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_claims_timeslot_id_fkey"
            columns: ["timeslot_id"]
            isOneToOne: false
            referencedRelation: "resource_timeslots"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_communities: {
        Row: {
          community_id: string
          created_at: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_communities_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_communities_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_responses: {
        Row: {
          created_at: string | null
          resource_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          resource_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          resource_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_responses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_timeslots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          max_claims: number
          resource_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          max_claims?: number
          resource_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          max_claims?: number
          resource_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_timeslots_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: Database["public"]["Enums"]["resource_category"] | null
          coordinates: unknown | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          image_urls: string[]
          location_name: string | null
          max_claims: number | null
          owner_id: string
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["resource_status"]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["resource_category"] | null
          coordinates?: unknown | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          image_urls?: string[]
          location_name?: string | null
          max_claims?: number | null
          owner_id: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["resource_status"]
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["resource_category"] | null
          coordinates?: unknown | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          image_urls?: string[]
          location_name?: string | null
          max_claims?: number | null
          owner_id?: string
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["resource_status"]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          community_id: string
          created_at: string
          from_user_id: string
          id: string
          image_urls: string[]
          message: string
          resource_id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          from_user_id: string
          id?: string
          image_urls?: string[]
          message: string
          resource_id: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          image_urls?: string[]
          message?: string
          resource_id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shoutouts_community_id"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      resource_category:
        | "tools"
        | "skills"
        | "food"
        | "supplies"
        | "event"
        | "other"
      resource_claim_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
        | "interested"
        | "given"
        | "received"
      resource_status: "open" | "completed" | "cancelled"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
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
      resource_category: [
        "tools",
        "skills",
        "food",
        "supplies",
        "event",
        "other",
      ],
      resource_claim_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "interested",
        "given",
        "received",
      ],
      resource_status: ["open", "completed", "cancelled"],
    },
  },
} as const