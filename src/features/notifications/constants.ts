import type { Database } from '../../shared/types/database';

export type NotificationType = Database['public']['Enums']['notification_type'];

// Notification type constants from database - single source of truth
export const NOTIFICATION_TYPES = {
  COMMUNITY_CREATED: 'community.created',
  COMMENT_CREATED: 'comment.created',
  COMMENT_REPLY: 'comment.replied',
  CLAIM_CREATED: 'claim.created',
  MESSAGE_CREATED: 'message.created',
  CONVERSATION_CREATED: 'conversation.created',
  RESOURCE_CREATED: 'resource.created',
  SHOUTOUT_RECEIVED: 'shoutout.received',
  SHOUTOUT_SENT: 'shoutout.sent',
  CONNECTION_REQUESTED: 'connection.requested',
  CONNECTION_ACCEPTED: 'connection.accepted',
  RESOURCE_CLAIM_CANCELLED: 'claim.cancelled',
  RESOURCE_CLAIM_COMPLETED: 'claim.completed',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  RESOURCE_UPDATED: 'resource.updated',
  RESOURCE_CANCELLED: 'resource.cancelled',
  COMMUNITY_MEMBER_JOINED: 'member.joined',
  COMMUNITY_MEMBER_LEFT: 'member.left',
  EVENT_CREATED: 'event.created',
  TRUST_POINTS_GAINED: 'trustpoints.gained',
  TRUST_POINTS_LOST: 'trustpoints.lost',
  TRUST_LEVEL_CHANGED: 'trustlevel.changed',
} as const satisfies Record<string, NotificationType>;

// Verify our constants match the database enum at compile time
// These type checks ensure our constants are always in sync with the database
// Note: These variables are intentionally unused - they provide compile-time type checking
