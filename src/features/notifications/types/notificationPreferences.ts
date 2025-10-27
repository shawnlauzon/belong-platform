import type { Database } from "../../../shared/types/database";
import type { NotificationType } from "../constants";

/**
 * Channel preferences for a notification type
 */
export interface ChannelPreferences {
  in_app: boolean;
  push: boolean;
  email: boolean;
}

/**
 * Full notification preferences row from database
 */
export type NotificationPreferences =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

/**
 * Update type for notification preferences
 */
export type NotificationPreferencesUpdate =
  Database["public"]["Tables"]["notification_preferences"]["Update"];

/**
 * Insert type for notification preferences
 */
export type NotificationPreferencesInsert =
  Database["public"]["Tables"]["notification_preferences"]["Insert"];

/**
 * Type-safe notification preferences with proper typing for each notification type
 */
export interface TypedNotificationPreferences {
  // Global switches
  push_enabled: boolean;
  email_enabled: boolean;

  // Per-type preferences
  "comment.replied": ChannelPreferences;
  "claim.created": ChannelPreferences;
  "resource.created": ChannelPreferences;
  "event.created": ChannelPreferences;
  "resource.updated": ChannelPreferences;
  "trustlevel.changed": ChannelPreferences;
  "resource.commented": ChannelPreferences;
  "claim.cancelled": ChannelPreferences;
  "claim.responded": ChannelPreferences;
  "resource.given": ChannelPreferences;
  "resource.received": ChannelPreferences;
  "event.updated": ChannelPreferences;
  "event.cancelled": ChannelPreferences;
  "resource.expiring": ChannelPreferences;
  "event.starting": ChannelPreferences;
  "membership.updated": ChannelPreferences;
  "conversation.requested": ChannelPreferences;
  "message.received": ChannelPreferences;
  "shoutout.received": ChannelPreferences;

  // Metadata
  user_id: string;
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Helper to parse JSONB channel preferences from database
 */
export function parseChannelPreferences(json: unknown): ChannelPreferences {
  if (!json || typeof json !== "object") {
    return { in_app: true, push: true, email: false };
  }

  const obj = json as Record<string, unknown>;

  return {
    in_app: obj.in_app === true,
    push: obj.push === true,
    email: obj.email === true,
  };
}

/**
 * Helper to convert database row to typed preferences
 */
export function toTypedPreferences(
  row: NotificationPreferences
): TypedNotificationPreferences {
  return {
    id: row.id,
    user_id: row.user_id,
    push_enabled: row.push_enabled,
    email_enabled: row.email_enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,

    "comment.replied": parseChannelPreferences(row["comment.replied"]),
    "claim.created": parseChannelPreferences(row["claim.created"]),
    "resource.created": parseChannelPreferences(row["resource.created"]),
    "event.created": parseChannelPreferences(row["event.created"]),
    "resource.updated": parseChannelPreferences(row["resource.updated"]),
    "trustlevel.changed": parseChannelPreferences(row["trustlevel.changed"]),
    "resource.commented": parseChannelPreferences(row["resource.commented"]),
    "claim.cancelled": parseChannelPreferences(row["claim.cancelled"]),
    "claim.responded": parseChannelPreferences(row["claim.responded"]),
    "resource.given": parseChannelPreferences(row["resource.given"]),
    "resource.received": parseChannelPreferences(row["resource.received"]),
    "event.updated": parseChannelPreferences(row["event.updated"]),
    "event.cancelled": parseChannelPreferences(row["event.cancelled"]),
    "resource.expiring": parseChannelPreferences(row["resource.expiring"]),
    "event.starting": parseChannelPreferences(row["event.starting"]),
    "membership.updated": parseChannelPreferences(row["membership.updated"]),
    "conversation.requested": parseChannelPreferences(
      row["conversation.requested"]
    ),
    "message.received": parseChannelPreferences(row["message.received"]),
    "shoutout.received": parseChannelPreferences(row["shoutout.received"]),
  };
}

/**
 * Helper to get channel preferences for a specific notification type
 */
export function getChannelPreferences(
  preferences: TypedNotificationPreferences,
  type: NotificationType
): ChannelPreferences {
  return preferences[type];
}

/**
 * Helper to check if a specific channel is enabled for a notification type
 */
export function isChannelEnabled(
  preferences: TypedNotificationPreferences,
  type: NotificationType,
  channel: keyof ChannelPreferences
): boolean {
  // Check global switch first
  if (channel === "push" && !preferences.push_enabled) {
    return false;
  }
  if (channel === "email" && !preferences.email_enabled) {
    return false;
  }

  // Special case: event.cancelled always enabled if push globally enabled
  if (type === "event.cancelled" && channel === "push") {
    return preferences.push_enabled;
  }

  return preferences[type][channel];
}
