import type { Notification } from './notification';
import type { ClaimDetails } from './claimDetails';
import { ResourceClaimStatus, ResourceType } from '@/features/resources';

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
  resourceType?: ResourceType;

  // Comment information (denormalized from comments table)
  commentContent?: string;

  // Claim information (denormalized from resource_claims table)
  claimStatus?: ResourceClaimStatus;
  claimDetails?: ClaimDetails;

  // Community information (denormalized from communities table)
  communityName?: string;
  communityAvatar?: string;

  // Shoutout information (denormalized from shoutouts table)
  shoutoutMessage?: string;
}
