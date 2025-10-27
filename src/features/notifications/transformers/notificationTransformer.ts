import type { NotificationDetail } from '../types/notificationDetail';
import type { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { ACTION_TYPES, type ActionType } from '../constants';
import { getTypedMetadata } from '../types/notificationMetadata';

export function toDomainNotification(
  row: NotificationDetailsRow,
): NotificationDetail {
  const action = (row.action ||
    ACTION_TYPES.RESOURCE_CREATED) as ActionType;
  const rawMetadata = (row.metadata as Record<string, unknown>) || {};

  return {
    id: row.id || '',
    userId: row.user_id || '',
    action,

    // Polymorphic references from view
    resourceId: row.resource_id || undefined,
    commentId: row.comment_id || undefined,
    claimId: row.claim_id || undefined,
    communityId: row.community_id || undefined,
    shoutoutId: row.shoutout_id || undefined,
    conversationId: row.conversation_id || undefined,

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

    // Typed metadata based on action
    metadata: getTypedMetadata(action, rawMetadata),

    // Status
    readAt: row.read_at ? new Date(row.read_at) : null,

    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
