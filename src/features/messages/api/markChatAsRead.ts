import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '@/shared';
import { logger } from '@/shared';

/**
 * Marks a community chat as read for the current user
 */
export async function markChatAsRead(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<void> {
  const userId = await getAuthIdOrThrow(supabase);

  const { error } = await supabase
    .from('community_memberships')
    .update({
      chat_read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('community_id', communityId);

  if (error) {
    logger.error('Error marking community chat as read', {
      error,
      communityId,
      userId,
    });
    throw error;
  }

  logger.info('Community chat marked as read', {
    communityId,
    userId,
  });
}
