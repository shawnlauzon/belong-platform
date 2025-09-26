import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '@/shared';
import { logger } from '../../../shared';

export async function markAsRead(
  client: SupabaseClient<Database>,
  conversationId: string,
): Promise<void> {
  const userId = await getAuthIdOrThrow(client);

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
