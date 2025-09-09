import { Conversation } from '../types';
import { ConversationRowWithParticipants } from '../types/messageRow';

export function toDomainConversation(
  row: ConversationRowWithParticipants,
): Conversation {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessageAt: row.last_message_at
      ? new Date(row.last_message_at)
      : undefined,
    lastMessagePreview: row.last_message_preview
      ? row.last_message_preview
      : undefined,
    lastMessageSenderId: row.last_message_sender_id
      ? row.last_message_sender_id
      : undefined,
    conversationType: row.conversation_type,
    communityId: row.community_id ? row.community_id : undefined,
    participants: row.conversation_participants.map((p) => p.user_id),
  };
}
