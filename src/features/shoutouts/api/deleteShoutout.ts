import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../shared';
import type { Database } from '../../../shared/types/database';

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
): Promise<void> {
  logger.debug('📢 API: Deleting shoutout', { shoutoutId });

  try {
    const { error } = await supabase
      .from('shoutouts')
      .delete()
      .eq('id', shoutoutId);

    if (error) {
      logger.error('📢 API: Error deleting shoutout', { error, shoutoutId });
      throw error;
    }

    logger.info('📢 API: Successfully deleted shoutout', { shoutoutId });
  } catch (error) {
    logger.error('📢 API: Failed to delete shoutout', { error, shoutoutId });
    throw error;
  }
}