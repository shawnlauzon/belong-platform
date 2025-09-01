import { Conversation, CommunityConversation } from '../types';
import {
  ConversationRow,
  ConversationWithParticipants,
} from '../types/messageRow';
import { toUserSummary } from '../../users/transformers/userTransformer';

export function transformConversation(
  row: ConversationWithParticipants,
  currentUserId: string,
): Conversation {
  const otherParticipant = row.conversation_participants.find(
    (p) => p.user_id !== currentUserId,
  );

  const currentParticipant = row.conversation_participants.find(
    (p) => p.user_id === currentUserId,
  );

  if (!otherParticipant || !currentParticipant) {
    throw new Error('Invalid conversation participants');
  }

  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
    lastMessagePreview: row.last_message_preview,
    lastMessageSenderId: row.last_message_sender_id,
    otherParticipant: toUserSummary(otherParticipant.public_profiles),
    unreadCount: currentParticipant.unread_count,
    lastReadAt: currentParticipant.last_read_at
      ? new Date(currentParticipant.last_read_at)
      : null,
    conversationType: 'direct',
  };
}

/**
 * Transform database row to CommunityConversation domain object
 */
export function transformCommunityConversation(
  conversationRow: ConversationRow,
  participantRow: { last_read_at: string | null; unread_count: number },
  participantCount: number,
): CommunityConversation {
  if (!conversationRow.community_id) {
    throw new Error('Community conversation must have community_id');
  }

  return {
    id: conversationRow.id,
    createdAt: new Date(conversationRow.created_at),
    updatedAt: new Date(conversationRow.updated_at),
    lastMessageAt: conversationRow.last_message_at
      ? new Date(conversationRow.last_message_at)
      : null,
    lastMessagePreview: conversationRow.last_message_preview,
    lastMessageSenderId: conversationRow.last_message_sender_id,
    communityId: conversationRow.community_id,
    conversationType: 'community',
    unreadCount: participantRow.unread_count,
    lastReadAt: participantRow.last_read_at
      ? new Date(participantRow.last_read_at)
      : null,
    participantCount,
  };
}
