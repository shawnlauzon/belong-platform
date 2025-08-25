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
  // Get current user and conversation data
  const currentUser = await getCurrentUser(client);
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const conversation = await fetchConversation(client, input.conversationId);
  const userId = currentUser.id;

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
    logger.error('Error sending message', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Failed to send message');
  }

  // Transform with participant data
  const message = transformMessage(data, userId, currentUser, conversation.otherParticipant);
  message.conversationId = input.conversationId;
  
  return message;
}