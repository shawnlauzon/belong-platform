import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { logger } from '../../../shared';

export async function markAsRead(
  client: SupabaseClient<Database>,
  conversationId: string
): Promise<void> {
  const { error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const { error } = await client.rpc('mark_messages_as_read', {
    p_conversation_id: conversationId,
  });

  if (error) {
    logger.error('Error marking messages as read', { error });
    throw error;
  }
}