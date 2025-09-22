import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { getAuthUserId } from '@/features/auth/api';
import { logger } from '../../../shared';

export async function markAsRead(
  client: SupabaseClient<Database>,
  conversationId: string,
): Promise<void> {
  const userId = await getAuthUserId(client);

  if (!userId) {
    throw new Error('User not authenticated');
  }

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
