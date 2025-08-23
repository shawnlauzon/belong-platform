import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DeleteMessageInput } from '../types';
import { logger } from '../../../shared';

export async function deleteMessage(
  client: SupabaseClient<Database>,
  input: DeleteMessageInput
): Promise<void> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  const { error } = await client
    .from('messages')
    .update({ 
      is_deleted: true,
      content: '[Message deleted]',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.messageId)
    .eq('sender_id', userId);

  if (error) {
    logger.error('Error deleting message', { error });
    throw error;
  }
}