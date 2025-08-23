import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { UnblockUserInput } from '../types';
import { logger } from '../../../shared';

export async function unblockUser(
  client: SupabaseClient<Database>,
  input: UnblockUserInput
): Promise<void> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  const { error } = await client
    .from('blocked_users')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', input.userId);

  if (error) {
    logger.error('Error unblocking user', { error });
    throw error;
  }
}