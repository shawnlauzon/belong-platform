import { CommunityChat, Conversation, DirectConversation } from '../types';
import {
  ConversationRowWithParticipants,
  ConversationRow,
} from '../types/messageRow';

export function toDomainConversation(
  row: ConversationRowWithParticipants | ConversationRow,
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
  };
}

export function toDomainCommunityChat(row: ConversationRow): CommunityChat {
  const conversation = toDomainConversation(row);
  return {
    ...conversation,
    communityId: row.community_id!,
  };
}

export function toDomainDirectConversation(
  row: ConversationRowWithParticipants,
): DirectConversation {
  const conversation = toDomainConversation(row);
  return {
    ...conversation,
    participants: row.conversation_participants.map((p) => p.user_id),
  };
}
