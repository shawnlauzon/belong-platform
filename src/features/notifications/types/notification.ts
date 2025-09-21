import type {
  CommentMetadata,
  ShoutoutMetadata,
  TrustPointsMetadata,
  TrustLevelMetadata,
  ResourceUpdatedMetadata,
} from './notificationMetadata';
import { NOTIFICATION_TYPES, type NotificationType } from '../constants';

// Union type for all possible metadata types
export type NotificationMetadata =
  | CommentMetadata
  | ShoutoutMetadata
  | TrustPointsMetadata
  | TrustLevelMetadata
  | ResourceUpdatedMetadata
  | Record<string, never>;

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

  // Typed metadata - will be properly typed based on notification type
  metadata: NotificationMetadata;

  // Status
  readAt: Date | null;

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
  type === NOTIFICATION_TYPES.COMMENT_CREATED ||
  type === NOTIFICATION_TYPES.COMMENT_REPLY;

export const isClaimNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.CLAIM_CREATED ||
  type === NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED ||
  type === NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED ||
  type === NOTIFICATION_TYPES.CLAIM_APPROVED ||
  type === NOTIFICATION_TYPES.CLAIM_REJECTED ||
  type === NOTIFICATION_TYPES.RESOURCE_UPDATED ||
  type === NOTIFICATION_TYPES.RESOURCE_CANCELLED;

export const isResourceNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.RESOURCE_CREATED ||
  type === NOTIFICATION_TYPES.EVENT_CREATED ||
  type === NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED ||
  type === NOTIFICATION_TYPES.COMMUNITY_MEMBER_LEFT;

export const isSocialNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.SHOUTOUT_RECEIVED ||
  type === NOTIFICATION_TYPES.CONNECTION_ACCEPTED;

export const isTrustNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.TRUST_POINTS_GAINED ||
  type === NOTIFICATION_TYPES.TRUST_POINTS_LOST ||
  type === NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED;

export const isMessageNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.MESSAGE_CREATED;

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
    case NOTIFICATION_TYPES.COMMENT_CREATED:
    case NOTIFICATION_TYPES.COMMENT_REPLY:
    case NOTIFICATION_TYPES.SHOUTOUT_RECEIVED:
    case NOTIFICATION_TYPES.CONNECTION_ACCEPTED:
      return NotificationGroup.SOCIAL_INTERACTIONS;

    case NOTIFICATION_TYPES.CLAIM_CREATED:
    case NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED:
    case NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED:
      return NotificationGroup.MY_RESOURCES;

    case NOTIFICATION_TYPES.CLAIM_APPROVED:
    case NOTIFICATION_TYPES.CLAIM_REJECTED:
    case NOTIFICATION_TYPES.RESOURCE_UPDATED:
    case NOTIFICATION_TYPES.RESOURCE_CANCELLED:
      return NotificationGroup.MY_REGISTRATIONS;

    case NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED:
    case NOTIFICATION_TYPES.COMMUNITY_MEMBER_LEFT:
      return NotificationGroup.MY_COMMUNITIES;

    case NOTIFICATION_TYPES.RESOURCE_CREATED:
    case NOTIFICATION_TYPES.EVENT_CREATED:
      return NotificationGroup.COMMUNITY_ACTIVITY;

    case NOTIFICATION_TYPES.TRUST_POINTS_GAINED:
    case NOTIFICATION_TYPES.TRUST_POINTS_LOST:
    case NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED:
      return NotificationGroup.TRUST_RECOGNITION;

    case NOTIFICATION_TYPES.MESSAGE_CREATED:
      return NotificationGroup.MESSAGES;

    default:
      // This should never happen due to TypeScript exhaustiveness checking
      return NotificationGroup.SOCIAL_INTERACTIONS;
  }
};
