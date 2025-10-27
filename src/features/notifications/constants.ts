import type { Database } from '../../shared/types/database';

export type NotificationType = Database['public']['Enums']['notification_type'];

// Notification type constants from database - single source of truth
export const NOTIFICATION_TYPES = {
  // Comments
  COMMENT_REPLIED: 'comment.replied',
  RESOURCE_COMMENTED: 'resource.commented',

  // Claims
  CLAIM_CREATED: 'claim.created',
  CLAIM_CANCELLED: 'claim.cancelled',
  CLAIM_RESPONDED: 'claim.responded',

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
  CONVERSATION_REQUESTED: 'conversation.requested',
  SHOUTOUT_RECEIVED: 'shoutout.received',
  MEMBERSHIP_UPDATED: 'membership.updated',

  // System
  TRUST_LEVEL_CHANGED: 'trustlevel.changed',
} as const satisfies Record<string, NotificationType>;

// Verify our constants match the database enum at compile time
// These type checks ensure our constants are always in sync with the database
// Note: These variables are intentionally unused - they provide compile-time type checking
