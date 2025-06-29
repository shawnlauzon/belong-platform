import type { Database } from '@belongnetwork/types/database';
import type { Conversation, ConversationInfo, ConversationData, User, Message } from '@belongnetwork/types';

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsertDbData = Database['public']['Tables']['conversations']['Insert'];

/**
 * Transform a database conversation record to a domain conversation object
 */
export function toDomainConversation(
  dbConversation: ConversationRow,
  refs: { participants: [User, User]; lastMessage?: Message }
): Conversation {
  if (!refs.participants || refs.participants.length !== 2) {
    throw new Error('Participants must be an array of exactly 2 users');
  }

  const [participant1, participant2] = refs.participants;

  // Validate participant IDs match the database record
  const participantIds = [participant1.id, participant2.id].sort();
  const dbParticipantIds = [dbConversation.participant_1_id, dbConversation.participant_2_id].sort();
  
  if (participantIds[0] !== dbParticipantIds[0] || participantIds[1] !== dbParticipantIds[1]) {
    throw new Error('Participant IDs do not match database record');
  }

  return {
    id: dbConversation.id,
    participant1Id: dbConversation.participant_1_id,
    participant2Id: dbConversation.participant_2_id,
    lastActivityAt: new Date(dbConversation.last_activity_at),
    lastMessageId: dbConversation.last_message_id || undefined,
    createdAt: new Date(dbConversation.created_at),
    updatedAt: new Date(dbConversation.updated_at),
    participants: refs.participants,
    lastMessage: refs.lastMessage,
  };
}

/**
 * Transform a database conversation record to a ConversationInfo object (lightweight for lists)
 */
export function toConversationInfo(
  dbConversation: ConversationRow,
  lastMessagePreview?: string,
  unreadCount?: number
): ConversationInfo {
  return {
    id: dbConversation.id,
    participant1Id: dbConversation.participant_1_id,
    participant2Id: dbConversation.participant_2_id,
    lastActivityAt: new Date(dbConversation.last_activity_at),
    lastMessageId: dbConversation.last_message_id || undefined,
    createdAt: new Date(dbConversation.created_at),
    updatedAt: new Date(dbConversation.updated_at),
    lastMessagePreview,
    unreadCount,
  };
}

/**
 * Transform a domain conversation data to a database insert record
 */
export function forDbConversationInsert(conversationData: ConversationData): ConversationInsertDbData {
  return {
    participant_1_id: conversationData.participant1Id,
    participant_2_id: conversationData.participant2Id,
  };
}