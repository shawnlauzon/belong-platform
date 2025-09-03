import type { Notification } from '../types/notification';
import type { NotificationRow } from '../types/notificationRow';

export function notificationTransformer(
  row: NotificationRow
): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as Notification['type'],
    
    // Polymorphic references
    resourceId: row.resource_id || undefined,
    commentId: row.comment_id || undefined,
    claimId: row.claim_id || undefined,
    messageId: row.message_id || undefined,
    conversationId: row.conversation_id || undefined,
    communityId: row.community_id || undefined,
    
    // Actor information
    actorId: row.actor_id || undefined,
    
    // Content
    title: row.title,
    body: row.body || undefined,
    imageUrl: row.image_url || undefined,
    actionUrl: row.action_url || undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    
    // Status
    isRead: row.is_read || false,
    readAt: row.read_at ? new Date(row.read_at) : undefined,
    
    // Timestamps
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  };
}