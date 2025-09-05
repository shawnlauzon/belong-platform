import type { Database } from '@/shared/types/database';
import type { Notification } from './notification';

/**
 * Enhanced notification type that includes all the rich denormalized data
 * from the notification_details view. This provides immediate access to
 * actor names, resource titles, comment content, etc. without additional queries.
 */
export interface NotificationDetail extends Notification {
  // Actor information (denormalized from profiles table)
  actorName?: string;
  actorAvatar?: string;

  // Resource information (denormalized from resources table)
  resourceTitle?: string;
  resourceLocation?: string;
  resourceType?: Database['public']['Enums']['resource_type'];
  resourceStatus?: Database['public']['Enums']['resource_status'];
  resourceOwnerId?: string;

  // Comment information (denormalized from comments table)
  commentContent?: string;
  commentParentId?: string;

  // Claim information (denormalized from resource_claims table)
  claimStatus?: Database['public']['Enums']['resource_claim_status'];
  claimClaimantId?: string;

  // Community information (denormalized from communities table)
  communityName?: string;
  communityType?: string;

  // Shoutout information (denormalized from shoutouts table)
  shoutoutMessage?: string;
  shoutoutSenderId?: string;
  shoutoutReceiverId?: string;

  // Trust score information (denormalized from trust_scores table)
  trustScore?: number;
  trustScoreCalculatedAt?: Date;
}