import type { NotificationDetail } from '../types/notificationDetail';
import type { NotificationDetailsRow } from '../types/notificationDetailsRow';
import type { Notification } from '../types/notification';

export function transformNotification(
  row: NotificationDetailsRow,
): NotificationDetail {
  return {
    id: row.id || '',
    userId: row.user_id || '',
    type: (row.type || 'new_resource') as Notification['type'],

    // Polymorphic references from view
    resourceId: row.resource_id || undefined,
    commentId: row.comment_id || undefined,
    claimId: row.claim_id || undefined,
    communityId: row.community_id || undefined,
    shoutoutId: row.shoutout_id || undefined,

    // Actor information (basic + denormalized)
    actorId: row.actor_id || undefined,
    actorName: row.actor_name || undefined,
    actorAvatar: row.actor_avatar || undefined,

    // Resource information (denormalized from resources table)
    resourceTitle: row.resource_title || undefined,
    resourceLocation: row.resource_location || undefined,
    resourceType: row.resource_type || undefined,
    resourceStatus: row.resource_status || undefined,
    resourceOwnerId: row.resource_owner_id || undefined,

    // Comment information (denormalized from comments table)
    commentContent: row.comment_content || undefined,
    commentParentId: row.comment_parent_id || undefined,

    // Claim information (denormalized from resource_claims table)
    claimStatus: row.claim_status || undefined,
    claimClaimantId: row.claim_claimant_id || undefined,

    // Community information (denormalized from communities table)
    communityName: row.community_name || undefined,
    communityType: row.community_type || undefined,

    // Shoutout information (denormalized from shoutouts table)
    shoutoutMessage: row.shoutout_message || undefined,
    shoutoutSenderId: row.shoutout_sender_id || undefined,
    shoutoutReceiverId: row.shoutout_receiver_id || undefined,

    // Trust score information (denormalized from trust_scores table)
    trustScore: row.trust_score || undefined,
    trustScoreCalculatedAt: row.trust_score_calculated_at 
      ? new Date(row.trust_score_calculated_at) 
      : undefined,

    // Generated content (client-side)
    metadata: (row.metadata as Record<string, unknown>) || {},

    // Status
    isRead: row.is_read || false,
    readAt: row.read_at ? new Date(row.read_at) : undefined,

    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
