import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { EditMessageInput } from '../types';
import { logger } from '../../../shared';

export async function editMessage(
  client: SupabaseClient<Database>,
  input: EditMessageInput,
): Promise<void> {
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

  // Note: Broadcasting is now handled automatically by the database trigger
}
