import type { Database } from "../../../shared/types/database";
import type { NotificationTypePreference } from "../constants";

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
 * Type-safe notification preferences with proper typing for each notification type preference
 */
export interface TypedNotificationPreferences {
  // Global switch - master toggle for all notifications
  notifications_enabled: boolean;

  // Per-type preferences (notification type categories, not actions)
  // Note: trustlevel.changed has no preference column (always enabled)
  "comment.replied": ChannelPreferences;
  "claim.created": ChannelPreferences;
  "resource.created": ChannelPreferences;
  "event.created": ChannelPreferences;
  "resource.updated": ChannelPreferences;
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
    notifications_enabled: row.notifications_enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,

    "comment.replied": parseChannelPreferences(row.comment_replied),
    "claim.created": parseChannelPreferences(row.claim_created),
    "resource.created": parseChannelPreferences(row.resource_created),
    "event.created": parseChannelPreferences(row.event_created),
    "resource.updated": parseChannelPreferences(row.resource_updated),
    "resource.commented": parseChannelPreferences(row.resource_commented),
    "claim.cancelled": parseChannelPreferences(row.claim_cancelled),
    "claim.responded": parseChannelPreferences(row.claim_responded),
    "resource.given": parseChannelPreferences(row.resource_given),
    "resource.received": parseChannelPreferences(row.resource_received),
    "event.updated": parseChannelPreferences(row.event_updated),
    "event.cancelled": parseChannelPreferences(row.event_cancelled),
    "resource.expiring": parseChannelPreferences(row.resource_expiring),
    "event.starting": parseChannelPreferences(row.event_starting),
    "membership.updated": parseChannelPreferences(row.membership_updated),
    "conversation.requested": parseChannelPreferences(
      row.conversation_requested
    ),
    "message.received": parseChannelPreferences(row.message_received),
    "shoutout.received": parseChannelPreferences(row.shoutout_received),
  };
}

/**
 * Helper to get channel preferences for a specific notification type preference
 */
export function getChannelPreferences(
  preferences: TypedNotificationPreferences,
  type: NotificationTypePreference
): ChannelPreferences {
  return preferences[type];
}

/**
 * Helper to check if a specific channel is enabled for a notification type preference
 */
export function isChannelEnabled(
  preferences: TypedNotificationPreferences,
  type: NotificationTypePreference,
  channel: keyof ChannelPreferences
): boolean {
  // Check global master switch first
  if (!preferences.notifications_enabled) {
    return false;
  }

  return preferences[type][channel];
}
