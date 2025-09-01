import { Message, MessageStatus } from '../types';
import { MessageWithStatus } from '../types/messageRow';
import { Database } from '../../../shared/types/database';
import { toUserSummary } from '../../users/transformers/userTransformer';
import { UserSummary, CurrentUser } from '../../users/types';

interface MessageBasic {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function transformMessage(
  row: MessageBasic,
  currentUserId: string,
  currentUser: CurrentUser,
  otherParticipant: UserSummary
): Message {
  // Determine sender based on sender_id - convert CurrentUser to UserSummary for consistency
  const currentUserSummary: UserSummary = {
    id: currentUser.id,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    fullName: currentUser.fullName,
    avatarUrl: currentUser.avatarUrl,
  };
  const sender = row.sender_id === currentUserId ? currentUserSummary : otherParticipant;

  return {
    id: row.id,
    conversationId: '', // Will be set by caller if needed
    senderId: row.sender_id,
    content: row.content,
    messageType: 'text' as 'text' | 'system', // Default to text for now
    isEdited: false, // Not fetching this field anymore
    isDeleted: false, // Not fetching this field anymore  
    encryptionVersion: 1, // Default value
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sender,
    isMine: row.sender_id === currentUserId,
  };
}


export function transformMessageWithStatus(
  row: MessageWithStatus & { sender: { id: string | null; first_name: string | null; last_name: string | null; full_name: string | null; avatar_url: string | null; } },
  currentUserId: string
): Message {
  const status = row.message_status.find(s => s.user_id === currentUserId);
  
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as 'text' | 'system',
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    encryptionVersion: row.encryption_version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sender: toUserSummary(row.sender),
    isMine: row.sender_id === currentUserId,
    status: status ? transformMessageStatus(status) : undefined,
  };
}

export function transformMessageStatus(row: Database['public']['Tables']['message_status']['Row']): MessageStatus {
  return {
    messageId: row.message_id,
    userId: row.user_id,
    deliveredAt: new Date(row.delivered_at),
    readAt: row.read_at ? new Date(row.read_at) : null,
  };
}