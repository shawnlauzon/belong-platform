import type { Database } from '../../shared/types/database';

export type NotificationType = Database['public']['Enums']['notification_type'];

// Notification type constants from database - single source of truth
export const NOTIFICATION_TYPES = {
  COMMENT: 'comment.created',
  COMMENT_REPLY: 'comment.replied',
  CLAIM: 'claim.created',
  MESSAGE: 'message.created',
  CONVERSATION: 'conversation.created',
  NEW_RESOURCE: 'resource.created',
  SHOUTOUT_RECEIVED: 'shoutout.received',
  CONNECTION_REQUESTED: 'connection.requested',
  CONNECTION_ACCEPTED: 'connection.accepted',
  RESOURCE_CLAIM_CANCELLED: 'claim.cancelled',
  RESOURCE_CLAIM_COMPLETED: 'claim.completed',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  CLAIMED_RESOURCE_UPDATED: 'resource.updated',
  CLAIMED_RESOURCE_CANCELLED: 'resource.cancelled',
  COMMUNITY_MEMBER_JOINED: 'member.joined',
  COMMUNITY_MEMBER_LEFT: 'member.left',
  NEW_EVENT: 'event.created',
  TRUST_POINTS_GAINED: 'trustpoints.gained',
  TRUST_POINTS_LOST: 'trustpoints.lost',
  TRUST_LEVEL_CHANGED: 'trustlevel.changed',
} as const satisfies Record<string, NotificationType>;

// Verify our constants match the database enum at compile time
// These type checks ensure our constants are always in sync with the database
// Note: These variables are intentionally unused - they provide compile-time type checking
