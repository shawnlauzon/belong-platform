import { Message, SendMessageInput, SendCommunityMessageInput } from '../types';
import { MessageInsert, MessageRow } from '../types/messageRow';

export function toDomainMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    communityId: row.community_id,
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
    conversation_id: message.conversationId || null,
    community_id: message.communityId || null,
    content: message.content,
  };
}

export function toCommunityMessageRow(message: SendCommunityMessageInput): MessageInsert {
  return {
    community_id: message.communityId,
    content: message.content,
  };
}
