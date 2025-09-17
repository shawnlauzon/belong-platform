import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { logger } from '../../../shared';

export async function markAsRead(
  client: SupabaseClient<Database>,
  conversationId: string
): Promise<void> {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  const { error } = await client
    .from('conversation_status')
    .upsert({
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Error marking messages as read', { error });
    throw error;
  }
}