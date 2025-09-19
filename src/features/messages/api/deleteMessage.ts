import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { logger } from '../../../shared';

export async function deleteMessage(
  client: SupabaseClient<Database>,
  messageId: string,
): Promise<void> {
  // Get the current message content to preserve it in previous_content
  const { data: messageToDelete, error: fetchError } = await client
    .from('messages')
    .select('id, conversation_id, content, created_at')
    .eq('id', messageId)
    .single();

  if (fetchError) {
    logger.error('Error fetching message to delete', { error: fetchError });
    throw fetchError;
  }

  if (!messageToDelete) {
    throw new Error('Message not found');
  }

  // Check if this is the last message in the conversation
  const { data: lastMessage, error: lastMessageError } = await client
    .from('messages')
    .select('id, created_at')
    .eq('conversation_id', messageToDelete.conversation_id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastMessageError && lastMessageError.code !== 'PGRST116') {
    logger.error('Error fetching last message', { error: lastMessageError });
    throw lastMessageError;
  }

  const isLastMessage = lastMessage?.id === messageToDelete.id;

  // Soft delete: mark message as deleted
  const { data: updatedMessage, error } = await client
    .from('messages')
    .update({
      is_deleted: true,
    })
    .eq('id', messageId)
    .select('id')
    .single();

  if (error) {
    // If we get a PGRST116 error, it means no rows were updated (RLS blocked it)
    if (error.code === 'PGRST116') {
      throw new Error('You do not have permission to delete this message');
    }
    logger.error('Error deleting message', { error });
    throw error;
  }

  // If we didn't get any data back, the update was blocked
  if (!updatedMessage) {
    throw new Error('You do not have permission to delete this message');
  }

  // If this was the last message, update the conversation preview
  if (isLastMessage) {
    const { error: conversationUpdateError } = await client
      .from('conversations')
      .update({
        last_message_preview: '[Message deleted]',
      })
      .eq('id', messageToDelete.conversation_id);

    if (conversationUpdateError) {
      logger.error(
        'Error updating conversation preview after message deletion',
        { error: conversationUpdateError },
      );
      // Don't throw here - the message deletion succeeded, this is just a preview update
    }
  }

  // Note: Broadcasting is now handled automatically by the database trigger
}
