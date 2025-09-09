import { Message, SendMessageInput } from '../types';
import { MessageInsert, MessageRow } from '../types/messageRow';

export function toDomainMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    encryptionVersion: row.encryption_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toMessageRow(message: SendMessageInput): MessageInsert {
  return {
    conversation_id: message.conversationId,
    content: message.content,
  };
}
