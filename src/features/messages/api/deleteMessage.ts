import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DeleteMessageInput } from '../types';
import { logger } from '../../../shared';

export async function deleteMessage(
  client: SupabaseClient<Database>,
  input: DeleteMessageInput
): Promise<void> {
  // Soft delete the message - minimal update
  const { data: updatedMessage, error } = await client
    .from('messages')
    .update({ 
      is_deleted: true,
    })
    .eq('id', input.messageId)
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
}