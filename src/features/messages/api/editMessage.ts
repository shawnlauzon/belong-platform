import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { EditMessageInput } from '../types';
import { logger } from '../../../shared';
import { channelManager } from './channelManager';

export async function editMessage(
  client: SupabaseClient<Database>,
  input: EditMessageInput,
): Promise<void> {
  // Get the current message content to preserve it in previous_content
  const { data: messageToEdit, error: fetchError } = await client
    .from('messages')
    .select('id, conversation_id, content, created_at')
    .eq('id', input.messageId)
    .single();

  if (fetchError) {
    logger.error('Error fetching message to edit', { error: fetchError });
    throw fetchError;
  }

  if (!messageToEdit) {
    throw new Error('Message not found');
  }

  // Check if this is the last message in the conversation
  const { data: lastMessage, error: lastMessageError } = await client
    .from('messages')
    .select('id, created_at')
    .eq('conversation_id', messageToEdit.conversation_id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastMessageError && lastMessageError.code !== 'PGRST116') {
    logger.error('Error fetching last message', { error: lastMessageError });
    throw lastMessageError;
  }

  const isLastMessage = lastMessage?.id === messageToEdit.id;

  // Edit: set new content and mark as edited
  const { data: updatedMessage, error } = await client
    .from('messages')
    .update({
      content: input.content,
      is_edited: true,
    })
    .eq('id', input.messageId)
    .select('id')
    .single();

  if (error) {
    // If we get a PGRST116 error, it means no rows were updated (RLS blocked it)
    if (error.code === 'PGRST116') {
      throw new Error('You do not have permission to edit this message');
    }
    logger.error('Error editing message', { error });
    throw error;
  }

  // If we didn't get any data back, the update was blocked
  if (!updatedMessage) {
    throw new Error('You do not have permission to edit this message');
  }

  // If this was the last message, update the conversation preview
  if (isLastMessage) {
    const { error: conversationUpdateError } = await client
      .from('conversations')
      .update({
        last_message_preview: input.content.substring(0, 100), // First 100 chars as preview
      })
      .eq('id', messageToEdit.conversation_id);

    if (conversationUpdateError) {
      logger.error('Error updating conversation preview after message edit', {
        error: conversationUpdateError,
      });
      // Don't throw here - the message edit succeeded, this is just a preview update
    }
  }

  // Broadcast the message update using the channel manager
  const channel = channelManager.getMessagesChannel(client, messageToEdit.conversation_id);

  await channelManager.broadcast(channel, 'message:updated', {
    message: input.content,
  });
}
