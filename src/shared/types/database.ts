export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      action_to_notification_type_mapping: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          notification_type: string
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          notification_type: string
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          notification_type?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string
          blocked_id: string
          blocker_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_id: string
          blocker_id: string
        }
        Update: {
          blocked_at?: string
          blocked_id?: string
          blocker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_status_transition_rules: {
        Row: {
          allowed_actor: string
          description: string | null
          from_status: Database["public"]["Enums"]["resource_claim_status"]
          id: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          to_status: Database["public"]["Enums"]["resource_claim_status"]
        }
        Insert: {
          allowed_actor: string
          description?: string | null
          from_status: Database["public"]["Enums"]["resource_claim_status"]
          id?: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          to_status: Database["public"]["Enums"]["resource_claim_status"]
        }
        Update: {
          allowed_actor?: string
          description?: string | null
          from_status?: Database["public"]["Enums"]["resource_claim_status"]
          id?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          to_status?: Database["public"]["Enums"]["resource_claim_status"]
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          parent_id: string | null
          resource_id: string | null
          shoutout_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          resource_id?: string | null
          shoutout_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          resource_id?: string | null
          shoutout_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_shoutout_id_fkey"
            columns: ["shoutout_id"]
            isOneToOne: false
            referencedRelation: "shoutouts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_image_url: string | null
          boundary: Json | null
          boundary_geometry: unknown
          center: unknown
          center_name: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          member_count: number
          name: string
          time_zone: string | null
          type: Database["public"]["Enums"]["community_type"]
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          boundary?: Json | null
          boundary_geometry?: unknown
          center?: unknown
          center_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number
          name: string
          time_zone?: string | null
          type: Database["public"]["Enums"]["community_type"]
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          boundary?: Json | null
          boundary_geometry?: unknown
          center?: unknown
          center_name?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number
          name?: string
          time_zone?: string | null
          type?: Database["public"]["Enums"]["community_type"]
          updated_at?: string
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          chat_read_at: string | null
          community_id: string
          created_at: string
          role: Database["public"]["Enums"]["community_membership_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_read_at?: string | null
          community_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["community_membership_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_read_at?: string | null
          community_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["community_membership_role"]
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
          {
            foreignKeyName: "community_memberships_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_last_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          initiator_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          code: string
          community_id: string
          created_at: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          community_id: string
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          community_id?: string
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_codes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          community_id: string | null
          content: string
          conversation_id: string | null
          created_at: string
          encryption_version: number
          id: string
          is_deleted: boolean
          is_edited: boolean
          sender_id: string
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          encryption_version?: number
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          sender_id?: string
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          encryption_version?: number
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_last_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          claim_cancelled: Json
          claim_created: Json
          claim_responded: Json
          comment_replied: Json
          connection_accepted: Json
          conversation_requested: Json
          created_at: string
          event_cancelled: Json
          event_created: Json
          event_starting: Json
          event_updated: Json
          id: string
          membership_updated: Json
          message_received: Json
          notifications_enabled: boolean
          resource_commented: Json
          resource_created: Json
          resource_expiring: Json
          resource_given: Json
          resource_received: Json
          resource_updated: Json
          shoutout_received: Json
          trustlevel_changed: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          claim_cancelled?: Json
          claim_created?: Json
          claim_responded?: Json
          comment_replied?: Json
          connection_accepted?: Json
          conversation_requested?: Json
          created_at?: string
          event_cancelled?: Json
          event_created?: Json
          event_starting?: Json
          event_updated?: Json
          id?: string
          membership_updated?: Json
          message_received?: Json
          notifications_enabled?: boolean
          resource_commented?: Json
          resource_created?: Json
          resource_expiring?: Json
          resource_given?: Json
          resource_received?: Json
          resource_updated?: Json
          shoutout_received?: Json
          trustlevel_changed?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          claim_cancelled?: Json
          claim_created?: Json
          claim_responded?: Json
          comment_replied?: Json
          connection_accepted?: Json
          conversation_requested?: Json
          created_at?: string
          event_cancelled?: Json
          event_created?: Json
          event_starting?: Json
          event_updated?: Json
          id?: string
          membership_updated?: Json
          message_received?: Json
          notifications_enabled?: boolean
          resource_commented?: Json
          resource_created?: Json
          resource_expiring?: Json
          resource_given?: Json
          resource_received?: Json
          resource_updated?: Json
          shoutout_received?: Json
          trustlevel_changed?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          actor_id: string | null
          changes: string[] | null
          claim_id: string | null
          comment_id: string | null
          community_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          read_at: string | null
          resource_id: string | null
          shoutout_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          actor_id?: string | null
          changes?: string[] | null
          claim_id?: string | null
          comment_id?: string | null
          community_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          resource_id?: string | null
          shoutout_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          actor_id?: string | null
          changes?: string[] | null
          claim_id?: string | null
          comment_id?: string | null
          community_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          resource_id?: string | null
          shoutout_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "resource_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_last_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shoutout_id_fkey"
            columns: ["shoutout_id"]
            isOneToOne: false
            referencedRelation: "shoutouts"
            referencedColumns: ["id"]
          },
        ]
      }
      player_levels: {
        Row: {
          emoji: string
          level_index: number
          max_score: number | null
          min_score: number
          name: string
        }
        Insert: {
          emoji: string
          level_index: number
          max_score?: number | null
          min_score: number
          name: string
        }
        Update: {
          emoji?: string
          level_index?: number
          max_score?: number | null
          min_score?: number
          name?: string
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
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_claims: {
        Row: {
          claimant_id: string
          commitment_level:
            | Database["public"]["Enums"]["commitment_level_enum"]
            | null
          created_at: string
          id: string
          request_text: string | null
          resource_id: string
          response_text: string | null
          status: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id: string
          updated_at: string
        }
        Insert: {
          claimant_id?: string
          commitment_level?:
            | Database["public"]["Enums"]["commitment_level_enum"]
            | null
          created_at?: string
          id?: string
          request_text?: string | null
          resource_id: string
          response_text?: string | null
          status: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id: string
          updated_at?: string
        }
        Update: {
          claimant_id?: string
          commitment_level?:
            | Database["public"]["Enums"]["commitment_level_enum"]
            | null
          created_at?: string
          id?: string
          request_text?: string | null
          resource_id?: string
          response_text?: string | null
          status?: Database["public"]["Enums"]["resource_claim_status"]
          timeslot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
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
          resource_id: string
          start_time: string
          status: Database["public"]["Enums"]["resource_timeslot_status"]
          updated_at: string
          vote_count: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          resource_id: string
          start_time: string
          status?: Database["public"]["Enums"]["resource_timeslot_status"]
          updated_at?: string
          vote_count?: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          resource_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["resource_timeslot_status"]
          updated_at?: string
          vote_count?: number
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
          category: Database["public"]["Enums"]["resource_category"]
          claim_limit: number | null
          claim_limit_per: Database["public"]["Enums"]["resource_claim_limit_per"]
          comment_count: number | null
          coordinates: unknown
          created_at: string
          description: string
          duration_minutes: number | null
          id: string
          image_urls: string[]
          is_recurring: boolean
          last_renewed_at: string
          location_name: string | null
          owner_id: string
          requires_approval: boolean
          status: Database["public"]["Enums"]["resource_status"]
          timeslots_flexible: boolean
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          voting_deadline: string | null
          expires_at: string | null
          is_active: boolean | null
        }
        Insert: {
          category: Database["public"]["Enums"]["resource_category"]
          claim_limit?: number | null
          claim_limit_per?: Database["public"]["Enums"]["resource_claim_limit_per"]
          comment_count?: number | null
          coordinates?: unknown
          created_at?: string
          description: string
          duration_minutes?: number | null
          id?: string
          image_urls?: string[]
          is_recurring?: boolean
          last_renewed_at?: string
          location_name?: string | null
          owner_id?: string
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["resource_status"]
          timeslots_flexible?: boolean
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          voting_deadline?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["resource_category"]
          claim_limit?: number | null
          claim_limit_per?: Database["public"]["Enums"]["resource_claim_limit_per"]
          comment_count?: number | null
          coordinates?: unknown
          created_at?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          image_urls?: string[]
          is_recurring?: boolean
          last_renewed_at?: string
          location_name?: string | null
          owner_id?: string
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["resource_status"]
          timeslots_flexible?: boolean
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          voting_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          comment_count: number | null
          community_id: string
          created_at: string
          id: string
          image_urls: string[]
          message: string
          receiver_id: string
          resource_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          comment_count?: number | null
          community_id: string
          created_at?: string
          id?: string
          image_urls?: string[]
          message: string
          receiver_id: string
          resource_id: string
          sender_id?: string
          updated_at?: string
        }
        Update: {
          comment_count?: number | null
          community_id?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          message?: string
          receiver_id?: string
          resource_id?: string
          sender_id?: string
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
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_from_user_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_to_user_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      trust_score_logs: {
        Row: {
          action_id: string | null
          action_type: Database["public"]["Enums"]["action_type"]
          community_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          points_change: number
          score_after: number
          score_before: number
          user_id: string | null
        }
        Insert: {
          action_id?: string | null
          action_type: Database["public"]["Enums"]["action_type"]
          community_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points_change: number
          score_after: number
          score_before: number
          user_id?: string | null
        }
        Update: {
          action_id?: string | null
          action_type?: Database["public"]["Enums"]["action_type"]
          community_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points_change?: number
          score_after?: number
          score_before?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_score_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_score_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          community_id: string
          created_at: string | null
          last_calculated_at: string
          score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string | null
          last_calculated_at?: string
          score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string | null
          last_calculated_at?: string
          score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_scores_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          created_at: string
          id: string
          other_id: string
          strength: Database["public"]["Enums"]["connection_strength"] | null
          type: Database["public"]["Enums"]["user_connection_type"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          other_id: string
          strength?: Database["public"]["Enums"]["connection_strength"] | null
          type?: Database["public"]["Enums"]["user_connection_type"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          other_id?: string
          strength?: Database["public"]["Enums"]["connection_strength"] | null
          type?: Database["public"]["Enums"]["user_connection_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_other_id_fkey"
            columns: ["other_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_other_id_fkey"
            columns: ["other_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      conversations_with_last_message: {
        Row: {
          created_at: string | null
          id: string | null
          initiator_id: string | null
          last_message_community_id: string | null
          last_message_content: string | null
          last_message_created_at: string | null
          last_message_encryption_version: number | null
          last_message_id: string | null
          last_message_is_deleted: boolean | null
          last_message_is_edited: boolean | null
          last_message_sender_id: string | null
          last_message_updated_at: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_community_id_fkey"
            columns: ["last_message_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      notification_details: {
        Row: {
          action: Database["public"]["Enums"]["action_type"] | null
          actor_data: Json | null
          actor_id: string | null
          changes: string[] | null
          claim_data: Json | null
          claim_id: string | null
          comment_data: Json | null
          comment_id: string | null
          community_id: string | null
          community_name: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          read_at: string | null
          resource_data: Json | null
          resource_id: string | null
          shoutout_id: string | null
          shoutout_message: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "resource_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_last_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_shoutout_id_fkey"
            columns: ["shoutout_id"]
            isOneToOne: false
            referencedRelation: "shoutouts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: never
          bio?: never
          created_at?: string | null
          first_name?: never
          full_name?: never
          id?: string | null
          last_name?: never
          updated_at?: string | null
        }
        Update: {
          avatar_url?: never
          bio?: never
          created_at?: string | null
          first_name?: never
          full_name?: never
          id?: string | null
          last_name?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_community_area: {
        Args: { community_id: string }
        Returns: number
      }
      calculate_event_cancellation_penalty: {
        Args: { p_cancelled_at?: string; p_timeslot_id: string }
        Returns: number
      }
      calculate_resource_expiration: {
        Args: {
          last_renewed_at: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: string
      }
      calculate_trust_level: { Args: { p_score: number }; Returns: number }
      communities_containing_point: {
        Args: { lat: number; lng: number }
        Returns: {
          area_km2: number
          depth: number
          distance_km: number
          id: string
          level_name: string
          member_count: number
          name: string
        }[]
      }
      create_notification_base: {
        Args: {
          p_action: Database["public"]["Enums"]["action_type"]
          p_actor_id?: string
          p_changes?: string[]
          p_claim_id?: string
          p_comment_id?: string
          p_community_id?: string
          p_conversation_id?: string
          p_resource_id?: string
          p_shoutout_id?: string
          p_user_id: string
        }
        Returns: string
      }
      create_user_connection: {
        Args: { p_invitee_id: string; p_inviter_id: string }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      estimate_population: {
        Args: { lat: number; lng: number; radius_km: number }
        Returns: number
      }
      expires_at: {
        Args: { "": Database["public"]["Tables"]["resources"]["Row"] }
        Returns: {
          error: true
        } & "the function public.expires_at with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      finalize_voted_timeslot: {
        Args: {
          p_chosen_timeslot_id: string
          p_requires_approval: boolean
          p_resource_id: string
        }
        Returns: undefined
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_anon_key: { Args: never; Returns: string }
      get_boundary_polygon: { Args: { community_id: string }; Returns: Json }
      get_invitation_details: {
        Args: { connection_code: string }
        Returns: {
          avatar_url: string
          community_id: string
          created_at: string
          first_name: string
          full_name: string
          is_active: boolean
          last_name: string
          user_id: string
        }[]
      }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_project_url: { Args: never; Returns: string }
      get_resource_renewal_days: {
        Args: { resource_type: Database["public"]["Enums"]["resource_type"] }
        Returns: number
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_active: {
        Args: { "": Database["public"]["Tables"]["resources"]["Row"] }
        Returns: {
          error: true
        } & "the function public.is_active with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      is_community_member_of_resource: {
        Args: { resource_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_resource_active: {
        Args: {
          last_renewed_at: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      is_resource_expired: {
        Args: {
          last_renewed_at: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      is_resource_owner: {
        Args: { resource_uuid: string; user_uuid: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_conversation_as_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      regenerate_invitation_code: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      store_circular_boundary: {
        Args: { boundary_data: Json; community_id: string }
        Returns: undefined
      }
      store_isochrone_boundary: {
        Args: {
          boundary_data: Json
          community_id: string
          original_polygon: unknown
        }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_trust_score: {
        Args: {
          p_action_id: string
          p_action_type: Database["public"]["Enums"]["action_type"]
          p_community_id: string
          p_metadata?: Json
          p_points_change: number
          p_user_id: string
        }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_is_community_member: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_conversation_participant: {
        Args: { check_user_id: string; conv_id: string }
        Returns: boolean
      }
      users_share_community: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
    }
    Enums: {
      action_type:
        | "resource.commented"
        | "comment.replied"
        | "claim.created"
        | "claim.approved"
        | "claim.rejected"
        | "claim.cancelled"
        | "claim.completed"
        | "resource.given"
        | "resource.received"
        | "resource.created"
        | "event.created"
        | "resource.updated"
        | "event.updated"
        | "event.cancelled"
        | "resource.expiring"
        | "event.starting"
        | "message.received"
        | "conversation.requested"
        | "shoutout.received"
        | "shoutout.sent"
        | "member.joined"
        | "member.left"
        | "trustlevel.changed"
        | "connection.accepted"
      commitment_level_enum: "interested" | "committed" | "none"
      community_membership_role: "member" | "organizer" | "founder"
      community_type: "neighbors" | "close" | "far" | "virtual"
      connection_strength:
        | "trusted"
        | "positive"
        | "neutral"
        | "negative"
        | "unknown"
      conversation_type: "direct" | "community"
      resource_category:
        | "tools"
        | "skills"
        | "food"
        | "supplies"
        | "other"
        | "rides"
        | "housing"
        | "drinks"
        | "games"
      resource_claim_limit_per: "total" | "timeslot"
      resource_claim_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
        | "given"
        | "going"
        | "attended"
        | "flaked"
        | "received"
        | "vote"
      resource_status:
        | "voting"
        | "scheduled"
        | "completed"
        | "cancelled"
        | "active"
      resource_timeslot_status:
        | "active"
        | "completed"
        | "cancelled"
        | "proposed"
      resource_type: "offer" | "request" | "event"
      user_connection_type: "invited"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
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
      action_type: [
        "resource.commented",
        "comment.replied",
        "claim.created",
        "claim.approved",
        "claim.rejected",
        "claim.cancelled",
        "claim.completed",
        "resource.given",
        "resource.received",
        "resource.created",
        "event.created",
        "resource.updated",
        "event.updated",
        "event.cancelled",
        "resource.expiring",
        "event.starting",
        "message.received",
        "conversation.requested",
        "shoutout.received",
        "shoutout.sent",
        "member.joined",
        "member.left",
        "trustlevel.changed",
        "connection.accepted",
      ],
      commitment_level_enum: ["interested", "committed", "none"],
      community_membership_role: ["member", "organizer", "founder"],
      community_type: ["neighbors", "close", "far", "virtual"],
      connection_strength: [
        "trusted",
        "positive",
        "neutral",
        "negative",
        "unknown",
      ],
      conversation_type: ["direct", "community"],
      resource_category: [
        "tools",
        "skills",
        "food",
        "supplies",
        "other",
        "rides",
        "housing",
        "drinks",
        "games",
      ],
      resource_claim_limit_per: ["total", "timeslot"],
      resource_claim_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "given",
        "going",
        "attended",
        "flaked",
        "received",
        "vote",
      ],
      resource_status: [
        "voting",
        "scheduled",
        "completed",
        "cancelled",
        "active",
      ],
      resource_timeslot_status: [
        "active",
        "completed",
        "cancelled",
        "proposed",
      ],
      resource_type: ["offer", "request", "event"],
      user_connection_type: ["invited"],
    },
  },
} as const

