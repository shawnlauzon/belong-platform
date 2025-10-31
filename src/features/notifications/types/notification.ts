import type {
  ClaimResponseMetadata,
  MembershipMetadata,
  TrustLevelMetadata,
  ResourceUpdatedMetadata,
  EventMetadata,
} from "./notificationMetadata";
import { ACTION_TYPES, type ActionType } from "../constants";

// Union type for all possible metadata types
export type NotificationMetadata =
  | ClaimResponseMetadata
  | MembershipMetadata
  | TrustLevelMetadata
  | ResourceUpdatedMetadata
  | EventMetadata
  | Record<string, never>;

export interface Notification {
  id: string;
  userId: string;
  action: ActionType;

  // Polymorphic references
  resourceId?: string;
  commentId?: string;
  claimId?: string;
  communityId?: string;
  shoutoutId?: string;
  conversationId?: string;

  // Actor information
  actorId?: string;

  // Typed metadata - will be properly typed based on action
  metadata: NotificationMetadata;

  // Status
  readAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationInput {
  action: ActionType;
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
export const isCommentNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.COMMENT_REPLIED ||
  action === ACTION_TYPES.RESOURCE_COMMENTED;

export const isClaimNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.CLAIM_CREATED ||
  action === ACTION_TYPES.CLAIM_APPROVED ||
  action === ACTION_TYPES.CLAIM_REJECTED ||
  action === ACTION_TYPES.CLAIM_CANCELLED;

export const isTransactionNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.RESOURCE_GIVEN ||
  action === ACTION_TYPES.RESOURCE_RECEIVED;

export const isResourceNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.RESOURCE_CREATED ||
  action === ACTION_TYPES.EVENT_CREATED ||
  action === ACTION_TYPES.RESOURCE_UPDATED ||
  action === ACTION_TYPES.EVENT_UPDATED ||
  action === ACTION_TYPES.EVENT_CANCELLED ||
  action === ACTION_TYPES.RESOURCE_EXPIRING ||
  action === ACTION_TYPES.EVENT_STARTING;

export const isSocialNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.SHOUTOUT_RECEIVED ||
  action === ACTION_TYPES.MEMBER_JOINED ||
  action === ACTION_TYPES.MEMBER_LEFT;

export const isTrustNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.TRUSTLEVEL_CHANGED;

export const isMessageNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.MESSAGE_RECEIVED;

export const isConversationNotification = (action: ActionType): boolean =>
  action === ACTION_TYPES.CONVERSATION_REQUESTED;
