import type { Database } from '../../shared/types/database';

export type NotificationType = Database['public']['Enums']['notification_type'];

// Notification type constants from database - single source of truth
export const NOTIFICATION_TYPES = {
  COMMENT: 'comment',
  COMMENT_REPLY: 'comment_reply',
  CLAIM: 'claim',
  MESSAGE: 'message',
  NEW_RESOURCE: 'new_resource',
  SHOUTOUT_RECEIVED: 'shoutout_received',
  CONNECTION_ACCEPTED: 'connection_accepted',
  RESOURCE_CLAIM_CANCELLED: 'resource_claim_cancelled',
  RESOURCE_CLAIM_COMPLETED: 'resource_claim_completed',
  CLAIM_APPROVED: 'claim_approved',
  CLAIM_REJECTED: 'claim_rejected',
  CLAIMED_RESOURCE_UPDATED: 'claimed_resource_updated',
  CLAIMED_RESOURCE_CANCELLED: 'claimed_resource_cancelled',
  COMMUNITY_MEMBER_JOINED: 'community_member_joined',
  COMMUNITY_MEMBER_LEFT: 'community_member_left',
  NEW_EVENT: 'new_event',
  TRUST_POINTS_CHANGED: 'trust_points_changed',
  TRUST_LEVEL_CHANGED: 'trust_level_changed',
} as const satisfies Record<string, NotificationType>;

// Verify our constants match the database enum at compile time
// These type checks ensure our constants are always in sync with the database
// Note: These variables are intentionally unused - they provide compile-time type checking