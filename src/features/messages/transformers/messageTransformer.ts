import { Message, MessageStatus } from '../types';
import { MessageWithSender, MessageWithStatus } from '../types/messageRow';
import { Database } from '../../../shared/types/database';
import { toDomainUser } from '../../users/transformers/userTransformer';

export function transformMessage(
  row: MessageWithSender,
  currentUserId: string
): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as 'text' | 'system',
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    encryptionVersion: row.encryption_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sender: toDomainUser(row.sender),
    isMine: row.sender_id === currentUserId,
  };
}

export function transformMessageWithStatus(
  row: MessageWithStatus & { sender: Database['public']['Tables']['profiles']['Row'] },
  currentUserId: string
): Message {
  const status = row.message_status.find(s => s.user_id === currentUserId);
  
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as 'text' | 'system',
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    encryptionVersion: row.encryption_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sender: toDomainUser(row.sender),
    isMine: row.sender_id === currentUserId,
    status: status ? transformMessageStatus(status) : undefined,
  };
}

export function transformMessageStatus(row: Database['public']['Tables']['message_status']['Row']): MessageStatus {
  return {
    messageId: row.message_id,
    userId: row.user_id,
    deliveredAt: new Date(row.delivered_at),
    readAt: row.read_at ? new Date(row.read_at) : null,
  };
}