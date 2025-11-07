import type { Database } from '../../shared/types/database';

// Action type from database - granular events that occurred
export type ActionType = Database['public']['Enums']['action_type'];

// Action type constants from database - single source of truth
export const ACTION_TYPES = {
  // Comments
  RESOURCE_COMMENTED: 'resource.commented',
  COMMENT_REPLIED: 'comment.replied',

  // Claims
  CLAIM_CREATED: 'claim.created',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  CLAIM_CANCELLED: 'claim.cancelled',
  CLAIM_COMPLETED: 'claim.completed',

  // Transaction Confirmation
  RESOURCE_GIVEN: 'resource.given',
  RESOURCE_RECEIVED: 'resource.received',

  // Resources & Events
  RESOURCE_CREATED: 'resource.created',
  EVENT_CREATED: 'event.created',
  RESOURCE_UPDATED: 'resource.updated',
  EVENT_UPDATED: 'event.updated',
  EVENT_CANCELLED: 'event.cancelled',
  RESOURCE_EXPIRING: 'resource.expiring',
  EVENT_STARTING: 'event.starting',

  // Social
  MESSAGE_RECEIVED: 'message.received',
  SHOUTOUT_SENT: 'shoutout.sent',
  SHOUTOUT_RECEIVED: 'shoutout.received',
  MEMBER_JOINED: 'member.joined',
  MEMBER_LEFT: 'member.left',
  CONNECTION_ACCEPTED: 'connection.accepted',

  // System
  TRUSTLEVEL_CHANGED: 'trustlevel.changed',
} as const satisfies Record<string, ActionType>;

// Notification type preference categories (user-facing)
// Note: trustlevel.changed is NOT included here as it has no preference toggle
export type NotificationTypePreference =
  | 'comment.replied'
  | 'resource.commented'
  | 'claim.created'
  | 'claim.cancelled'
  | 'claim.responded'
  | 'resource.given'
  | 'resource.received'
  | 'resource.created'
  | 'event.created'
  | 'resource.updated'
  | 'event.updated'
  | 'event.cancelled'
  | 'resource.expiring'
  | 'event.starting'
  | 'message.received'
  | 'shoutout.received'
  | 'membership.updated';

// Mapping from actions to notification type preferences
// This matches the database mapping table
// Note: trustlevel.changed has no preference (always enabled)
export const ACTION_TO_NOTIFICATION_TYPE_MAP: Partial<
  Record<ActionType, NotificationTypePreference>
> = {
  // Comments (1:1)
  'resource.commented': 'resource.commented',
  'comment.replied': 'comment.replied',

  // Claims
  'claim.created': 'claim.created',
  'claim.cancelled': 'claim.cancelled',
  'claim.approved': 'claim.responded', // many-to-one
  'claim.rejected': 'claim.responded', // many-to-one

  // Transaction confirmation (1:1)
  'resource.given': 'resource.given',
  'resource.received': 'resource.received',

  // Resources & Events (1:1)
  'resource.created': 'resource.created',
  'event.created': 'event.created',
  'resource.updated': 'resource.updated',
  'event.updated': 'event.updated',
  'event.cancelled': 'event.cancelled',
  'resource.expiring': 'resource.expiring',
  'event.starting': 'event.starting',

  // Social (1:1)
  'message.received': 'message.received',
  'shoutout.received': 'shoutout.received',

  // Membership (many-to-one)
  'member.joined': 'membership.updated',
  'member.left': 'membership.updated',

  // System: trustlevel.changed omitted (no preference, always enabled)
};

/**
 * Get the notification type preference category for an action.
 * Returns null for system actions that have no preference (like trustlevel.changed).
 * This is used to check user preferences for a given action.
 */
export function getNotificationTypeForAction(
  action: ActionType,
): NotificationTypePreference | null {
  return ACTION_TO_NOTIFICATION_TYPE_MAP[action] ?? null;
}
