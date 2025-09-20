import { CommunityChat, Conversation, DirectConversation } from '../types';
import {
  ConversationRowWithParticipants,
  ConversationRow,
  ConversationRowWithLastMessage,
} from '../types/messageRow';
import { toDomainMessage } from './messageTransformer';

export function toDomainConversation(
  row:
    | ConversationRowWithParticipants
    | ConversationRow
    | ConversationRowWithLastMessage,
): Conversation {
  const lastMessage =
    'last_message' in row && row.last_message
      ? toDomainMessage(row.last_message)
      : null;

  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessage,
    conversationType: row.conversation_type,
  };
}

export function toDomainCommunityChat(
  row: ConversationRow | ConversationRowWithLastMessage,
): CommunityChat {
  const conversation = toDomainConversation(row);
  return {
    ...conversation,
    conversationType: 'community' as const,
    communityId: row.community_id!,
  };
}

export function toDomainDirectConversation(
  row: ConversationRowWithParticipants | ConversationRowWithLastMessage,
): DirectConversation {
  const conversation = toDomainConversation(row);
  return {
    ...conversation,
    conversationType: 'direct' as const,
    participants: row.conversation_participants.map((p) => p.user_id),
  };
}
