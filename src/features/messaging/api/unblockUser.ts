import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { UnblockUserInput } from '../types';
import { logger } from '../../../shared';

export async function unblockUser(
  client: SupabaseClient<Database>,
  userId: string,
  input: UnblockUserInput
): Promise<void> {
  const { error } = await client
    .from('blocked_users')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', input.blockedUserId);

  if (error) {
    logger.error('Error unblocking user', { error });
    throw error;
  }
}