import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message, SendMessageInput } from '../types';
import { MessageWithSender } from '../types/messageRow';
import { transformMessage } from '../transformers';
import { logger } from '../../../shared';

export async function sendMessage(
  client: SupabaseClient<Database>,
  input: SendMessageInput
): Promise<Message> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  // Verify user is participant
  const { data: participant, error: participantError } = await client
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', userId)
    .single();

  if (participantError || !participant) {
    throw new Error('You are not a participant in this conversation');
  }

  // Insert message
  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: userId,
      content: input.content,
      message_type: input.messageType || 'text',
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(*)
    `)
    .single();

  if (error) {
    logger.error('Error sending message', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Failed to send message');
  }

  return transformMessage(data as MessageWithSender, userId);
}