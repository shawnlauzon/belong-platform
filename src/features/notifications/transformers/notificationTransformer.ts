import type { Notification } from '../types/notification';
import type { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { generateNotificationContent } from '../utils/generateNotificationContent';

export function notificationTransformer(
  row: NotificationDetailsRow
): Notification {
  // Generate content based on notification type and joined data
  const { title, body, actionUrl, imageUrl } = generateNotificationContent(row);
  
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
    
    // Actor information
    actorId: row.actor_id || undefined,
    
    // Generated content (client-side)
    title,
    body: body || undefined,
    imageUrl: imageUrl || undefined,
    actionUrl,
    metadata: (row.metadata as Record<string, unknown>) || {},
    
    // Status
    isRead: row.is_read || false,
    readAt: row.read_at ? new Date(row.read_at) : undefined,
    
    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}