import type { Database } from '../../../shared/types/database';
import { User } from '../../users';
import type { Message, MessageInfo, MessageData } from '../types';

export type DirectMessageRow =
  Database['public']['Tables']['direct_messages']['Row'];
export type DirectMessageInsertDbData =
  Database['public']['Tables']['direct_messages']['Insert'];

/**
 * Transform a database message record to a domain message object
 */
export function toDomainMessage(
  dbMessage: DirectMessageRow,
  refs: { fromUser: User; toUser: User }
): Message {
  if (!refs.fromUser) {
    throw new Error('From user is required');
  }

  if (!refs.toUser) {
    throw new Error('To user is required');
  }

  if (dbMessage.from_user_id !== refs.fromUser.id) {
    throw new Error('From user ID does not match');
  }

  if (dbMessage.to_user_id !== refs.toUser.id) {
    throw new Error('To user ID does not match');
  }

  return {
    id: dbMessage.id,
    conversationId: dbMessage.conversation_id,
    content: dbMessage.content,
    readAt: dbMessage.read_at ? new Date(dbMessage.read_at) : undefined,
    createdAt: new Date(dbMessage.created_at),
    updatedAt: new Date(dbMessage.updated_at),
    fromUser: refs.fromUser,
    toUser: refs.toUser,
  };
}

/**
 * Transform a database message record to a MessageInfo object (lightweight for lists)
 */
export function toMessageInfo(dbMessage: DirectMessageRow): MessageInfo {
  return {
    id: dbMessage.id,
    conversationId: dbMessage.conversation_id,
    fromUserId: dbMessage.from_user_id,
    toUserId: dbMessage.to_user_id,
    content: dbMessage.content,
    readAt: dbMessage.read_at ? new Date(dbMessage.read_at) : undefined,
    createdAt: new Date(dbMessage.created_at),
    updatedAt: new Date(dbMessage.updated_at),
  };
}

/**
 * Transform a domain message data to a database insert record
 */
export function forDbMessageInsert(
  messageData: MessageData,
  fromUserId: string,
  toUserId: string
): DirectMessageInsertDbData {
  return {
    conversation_id: messageData.conversationId,
    content: messageData.content,
    from_user_id: fromUserId,
    to_user_id: toUserId,
  };
}
