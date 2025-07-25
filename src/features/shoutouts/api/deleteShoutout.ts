import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../shared';
import type { Database } from '../../../shared/types/database';
import { ShoutoutRow } from '../types/shoutoutRow';
import { Shoutout } from '../types';
import { toDomainShoutout } from '../transformers/shoutoutsTransformer';

/**
 * Delete a shoutout by ID.
 *
 * @param supabase - The Supabase client
 * @param shoutoutId - The ID of the shoutout to delete
 * @returns Promise that resolves when the shoutout is deleted
 * @throws Error if the shoutout is not found or deletion fails
 */
export async function deleteShoutout(
  supabase: SupabaseClient<Database>,
  shoutoutId: string,
): Promise<Shoutout | null> {
  logger.debug('📢 API: Deleting shoutout', { shoutoutId });

  try {
    const { data, error } = (await supabase
      .from('shoutouts')
      .delete()
      .eq('id', shoutoutId)
      .select()
      .maybeSingle()) as { data: ShoutoutRow | null; error: QueryError | null };

    if (error) {
      logger.error('📢 API: Error deleting shoutout', { error, shoutoutId });
      throw error;
    }

    logger.info('📢 API: Successfully deleted shoutout', { shoutoutId });
    return data ? toDomainShoutout(data) : null;
  } catch (error) {
    logger.error('📢 API: Failed to delete shoutout', { error, shoutoutId });
    throw error;
  }
}
