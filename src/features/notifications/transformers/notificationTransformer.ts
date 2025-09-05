import type { NotificationDetail } from '../types/notificationDetail';
import type { NotificationDetailsRow } from '../types/notificationDetailsRow';
import type { NotificationType } from '../types/notification';
import { getTypedMetadata } from '../types/notificationMetadata';

export function transformNotification(
  row: NotificationDetailsRow,
): NotificationDetail {
  const type = (row.type || 'new_resource') as NotificationType;
  const rawMetadata = (row.metadata as Record<string, unknown>) || {};

  return {
    id: row.id || '',
    userId: row.user_id || '',
    type,

    // Polymorphic references from view
    resourceId: row.resource_id || undefined,
    commentId: row.comment_id || undefined,
    claimId: row.claim_id || undefined,
    communityId: row.community_id || undefined,
    shoutoutId: row.shoutout_id || undefined,

    // Actor information (basic + denormalized)
    actorId: row.actor_id || undefined,
    actorName: row.actor_display_name || undefined,
    actorAvatar: row.actor_avatar_url || undefined,

    // Resource information (denormalized from resources table)
    resourceTitle: row.resource_title || undefined,
    resourceType: row.resource_type || undefined,

    // Comment information (denormalized from comments table)
    commentContent: row.comment_content || undefined,

    // Claim information (denormalized from resource_claims table)
    claimStatus: row.claim_status || undefined,

    // Community information (denormalized from communities table)
    communityName: row.community_name || undefined,
    communityAvatar: row.community_avatar_url || undefined,

    // Shoutout information (denormalized from shoutouts table)
    shoutoutMessage: row.shoutout_message || undefined,

    // Typed metadata based on notification type
    metadata: getTypedMetadata(type, rawMetadata),

    // Status
    isRead: row.is_read || false,
    readAt: row.read_at ? new Date(row.read_at) : undefined,

    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
