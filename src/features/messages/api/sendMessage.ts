import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message, SendMessageInput } from '../types';
import { transformMessage } from '../transformers';
import { logger } from '../../../shared';
import { fetchConversation } from './fetchConversation';
import { getCurrentUser } from '../../auth/api/getCurrentUser';

export async function sendMessage(
  client: SupabaseClient<Database>,
  input: SendMessageInput
): Promise<Message> {
  logger.info('Starting message send process', {
    conversationId: input.conversationId,
    messageType: input.messageType || 'text',
    contentLength: input.content?.length || 0
  });

  // Get current user and conversation data
  const currentUser = await getCurrentUser(client);
  if (!currentUser) {
    logger.warn('Message send failed: user not authenticated', { conversationId: input.conversationId });
    throw new Error('Not authenticated');
  }

  logger.debug('Retrieved current user for message send', {
    userId: currentUser.id,
    conversationId: input.conversationId
  });

  const conversation = await fetchConversation(client, input.conversationId);
  const userId = currentUser.id;

  logger.debug('Retrieved conversation data for message send', {
    conversationId: input.conversationId,
    otherParticipantId: conversation.otherParticipant?.id,
    userId
  });

  // Insert message with minimal fields
  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: userId,
      content: input.content,
      message_type: input.messageType || 'text',
    })
    .select('id, sender_id, content, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Database error while sending message', { 
      error,
      conversationId: input.conversationId,
      userId,
      messageType: input.messageType || 'text'
    });
    throw error;
  }

  if (!data) {
    logger.error('No data returned from message insert', { conversationId: input.conversationId, userId });
    throw new Error('Failed to send message');
  }

  logger.info('Message successfully inserted to database', {
    messageId: data.id,
    conversationId: input.conversationId,
    senderId: data.sender_id,
    createdAt: data.created_at
  });

  // Transform with participant data
  const message = transformMessage(data, userId, currentUser, conversation.otherParticipant);
  message.conversationId = input.conversationId;
  
  logger.info('Message send process completed successfully', {
    messageId: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId
  });

  return message;
}