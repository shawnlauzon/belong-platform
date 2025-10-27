import type {
  ClaimResponseMetadata,
  MembershipMetadata,
  TrustLevelMetadata,
  ResourceUpdatedMetadata,
  ResourceTitleMetadata,
} from "./notificationMetadata";
import { NOTIFICATION_TYPES, type NotificationType } from "../constants";

// Union type for all possible metadata types
export type NotificationMetadata =
  | ClaimResponseMetadata
  | MembershipMetadata
  | TrustLevelMetadata
  | ResourceUpdatedMetadata
  | ResourceTitleMetadata
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
  conversationId?: string;

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
  conversationId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

// Type guards for notification categories
export const isCommentNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.COMMENT_REPLIED ||
  type === NOTIFICATION_TYPES.RESOURCE_COMMENTED;

export const isClaimNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.CLAIM_CREATED ||
  type === NOTIFICATION_TYPES.CLAIM_CANCELLED ||
  type === NOTIFICATION_TYPES.CLAIM_RESPONDED;

export const isTransactionNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.RESOURCE_GIVEN ||
  type === NOTIFICATION_TYPES.RESOURCE_RECEIVED;

export const isResourceNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.RESOURCE_CREATED ||
  type === NOTIFICATION_TYPES.EVENT_CREATED ||
  type === NOTIFICATION_TYPES.RESOURCE_UPDATED ||
  type === NOTIFICATION_TYPES.EVENT_UPDATED ||
  type === NOTIFICATION_TYPES.EVENT_CANCELLED ||
  type === NOTIFICATION_TYPES.RESOURCE_EXPIRING ||
  type === NOTIFICATION_TYPES.EVENT_STARTING;

export const isSocialNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.SHOUTOUT_RECEIVED ||
  type === NOTIFICATION_TYPES.MEMBERSHIP_UPDATED;

export const isTrustNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED;

export const isMessageNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.MESSAGE_RECEIVED;

export const isConversationNotification = (type: NotificationType): boolean =>
  type === NOTIFICATION_TYPES.CONVERSATION_REQUESTED;
