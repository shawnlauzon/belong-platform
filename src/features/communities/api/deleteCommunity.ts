import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function deleteCommunity(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  logger.debug('🏘️ API: Deleting community', { id });

  try {
    await getAuthIdOrThrow(supabase);

    const { error } = await supabase.from('communities').delete().eq('id', id);

    if (error) {
      logger.error('🏘️ API: Failed to delete community', { error, id });
      throw error;
    }

    logger.debug('🏘️ API: Successfully deleted community', { id });
  } catch (error) {
    logger.error('🏘️ API: Error deleting community', { error, id });
    throw error;
  }
}
