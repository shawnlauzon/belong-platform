import { Conversation } from '../types';
import {
  ConversationRowWithParticipants,
  ConversationRowWithLastMessage,
  ConversationRowFromView,
} from '../types/messageRow';
import { toDomainMessage } from './messageTransformer';

export function toDomainConversation(
  row: ConversationRowWithParticipants | ConversationRowWithLastMessage | ConversationRowFromView,
): Conversation {
  // Handle view-based row (from conversations_with_last_message view)
  if ('last_message_id' in row) {
    const lastMessage = row.last_message_id ? {
      id: row.last_message_id,
      content: row.last_message_content || '',
      senderId: row.last_message_sender_id!,
      createdAt: new Date(row.last_message_created_at!),
      updatedAt: new Date(row.last_message_updated_at!),
      isDeleted: row.last_message_is_deleted || false,
      conversationId: row.id!,
      communityId: row.last_message_community_id,
      encryptionVersion: row.last_message_encryption_version || 0,
      isEdited: row.last_message_is_edited || false,
    } : null;

    return {
      id: row.id!,
      createdAt: new Date(row.created_at!),
      updatedAt: new Date(row.updated_at!),
      lastMessage,
      initiatorId: row.initiator_id!,
      participants: row.conversation_participants.map((p) => p.user_id),
    };
  }

  // Handle traditional row (from conversations table with join)
  const lastMessage =
    'last_message' in row && row.last_message
      ? toDomainMessage(row.last_message[0])
      : null;

  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessage,
    initiatorId: row.initiator_id!,
    participants: row.conversation_participants.map((p) => p.user_id),
  };
}
