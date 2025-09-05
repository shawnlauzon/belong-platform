import type { Database } from '../../../shared/types/database';

export type NotificationType = Database['public']['Enums']['notification_type'];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;

  // Polymorphic references
  resourceId?: string;
  commentId?: string;
  claimId?: string;
  communityId?: string;
  shoutoutId?: string;

  // Actor information
  actorId?: string;

  // Content
  metadata: Record<string, unknown>;

  // Status
  isRead: boolean;
  readAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationInput {
  type: NotificationType;
  resourceId?: string;
  commentId?: string;
  claimId?: string;
  communityId?: string;
  shoutoutId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

// Type guards for notification categories
export const isCommentNotification = (type: NotificationType): boolean =>
  ['comment', 'comment_reply'].includes(type);

export const isClaimNotification = (type: NotificationType): boolean =>
  [
    'claim',
    'resource_claim_cancelled',
    'resource_claim_completed',
    'claim_approved',
    'claim_rejected',
    'claimed_resource_updated',
    'claimed_resource_cancelled',
  ].includes(type);

export const isResourceNotification = (type: NotificationType): boolean =>
  [
    'new_resource',
    'new_event',
    'community_member_joined',
    'community_member_left',
  ].includes(type);

export const isSocialNotification = (type: NotificationType): boolean =>
  ['shoutout_received', 'connection_accepted'].includes(type);

export const isTrustNotification = (type: NotificationType): boolean =>
  ['trust_points_changed', 'trust_level_changed'].includes(type);

export const isMessageNotification = (type: NotificationType): boolean =>
  type === 'message';

// Notification permission groups
export enum NotificationGroup {
  SOCIAL_INTERACTIONS = 'social_interactions',
  MY_RESOURCES = 'my_resources',
  MY_REGISTRATIONS = 'my_registrations',
  MY_COMMUNITIES = 'my_communities',
  COMMUNITY_ACTIVITY = 'community_activity',
  TRUST_RECOGNITION = 'trust_recognition',
  MESSAGES = 'messages',
}

export const getNotificationGroup = (
  type: NotificationType,
): NotificationGroup => {
  switch (type) {
    case 'comment':
    case 'comment_reply':
    case 'shoutout_received':
    case 'connection_accepted':
      return NotificationGroup.SOCIAL_INTERACTIONS;

    case 'claim':
    case 'resource_claim_cancelled':
    case 'resource_claim_completed':
      return NotificationGroup.MY_RESOURCES;

    case 'claim_approved':
    case 'claim_rejected':
    case 'claimed_resource_updated':
    case 'claimed_resource_cancelled':
      return NotificationGroup.MY_REGISTRATIONS;

    case 'community_member_joined':
    case 'community_member_left':
      return NotificationGroup.MY_COMMUNITIES;

    case 'new_resource':
    case 'new_event':
      return NotificationGroup.COMMUNITY_ACTIVITY;

    case 'trust_points_changed':
    case 'trust_level_changed':
      return NotificationGroup.TRUST_RECOGNITION;

    case 'message':
      return NotificationGroup.MESSAGES;

    default:
      return NotificationGroup.SOCIAL_INTERACTIONS;
  }
};
