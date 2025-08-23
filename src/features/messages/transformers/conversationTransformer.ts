import { Conversation } from '../types';
import { ConversationWithParticipants } from '../types/messageRow';
import { toDomainUser } from '../../users/transformers/userTransformer';

export function transformConversation(
  row: ConversationWithParticipants,
  currentUserId: string
): Conversation {
  const otherParticipant = row.conversation_participants.find(
    p => p.user_id !== currentUserId
  );
  
  const currentParticipant = row.conversation_participants.find(
    p => p.user_id === currentUserId
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
    otherParticipant: toDomainUser(otherParticipant.profiles),
    unreadCount: currentParticipant.unread_count,
    lastReadAt: currentParticipant.last_read_at 
      ? new Date(currentParticipant.last_read_at) 
      : null,
  };
}