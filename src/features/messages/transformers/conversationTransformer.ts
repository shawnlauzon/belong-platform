import { Conversation } from '../types';
import {
  ConversationRowWithParticipants,
  ConversationRowWithLastMessage,
} from '../types/messageRow';
import { toDomainMessage } from './messageTransformer';

export function toDomainConversation(
  row: ConversationRowWithParticipants | ConversationRowWithLastMessage,
): Conversation {
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
