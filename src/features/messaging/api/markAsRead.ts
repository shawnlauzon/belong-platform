import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { logger } from '../../../shared';

export async function markAsRead(
  client: SupabaseClient<Database>,
  userId: string,
  conversationId: string,
): Promise<void> {

  const { error } = await client
    .from('conversation_participants')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error marking messages as read', { error });
    throw error;
  }
}
