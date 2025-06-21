import type { Tables } from '@belongnetwork/types';
import type { 
  Notification, 
  NotificationInfo, 
  NotificationData,
  User,
  Conversation,
  Message
} from '@belongnetwork/types';

type NotificationRow = Tables<'notifications'>;

export function toDomainNotification(
  row: NotificationRow,
  sender?: User,
  conversation?: Conversation,
  message?: Message
): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as 'message' | 'mention' | 'system',
    title: row.title,
    content: row.content || undefined,
    data: row.data ? (row.data as any) : undefined,
    read: row.read || false,
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
    sender,
    conversation,
    message,
  };
}

export function toDomainNotificationInfo(row: NotificationRow): NotificationInfo {
  const data = row.data as any;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as 'message' | 'mention' | 'system',
    title: row.title,
    content: row.content || undefined,
    data: data || undefined,
    read: row.read || false,
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
    senderId: data?.senderId,
    conversationId: data?.conversationId,
    messageId: data?.messageId,
  };
}

export function forDbNotificationInsert(
  notificationData: NotificationData
): Tables<'notifications'>['Insert'] {
  return {
    user_id: notificationData.userId,
    type: notificationData.type,
    title: notificationData.title,
    content: notificationData.content || null,
    data: notificationData.data ? JSON.parse(JSON.stringify(notificationData.data)) : null,
    read: false,
  };
}