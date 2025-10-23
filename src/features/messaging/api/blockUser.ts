import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { BlockUserInput } from '../types';
import { logger } from '../../../shared';

export async function blockUser(
  client: SupabaseClient<Database>,
  userId: string,
  input: BlockUserInput
): Promise<void> {
  if (userId === input.blockedUserId) {
    throw new Error('Cannot block yourself');
  }

  const { error } = await client
    .from('blocked_users')
    .insert({
      blocker_id: userId,
      blocked_id: input.blockedUserId,
    });

  if (error) {
    logger.error('Error blocking user', { error });
    throw error;
  }
}