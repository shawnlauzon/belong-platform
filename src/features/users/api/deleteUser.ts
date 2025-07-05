import { logger } from '@/shared';
import { ERROR_CODES } from '@/shared/constants';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

export async function deleteUser(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<void> {
  logger.debug('👤 API: Deleting user', { id });

  try {
    // Check if user exists before deletion
    const { error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === ERROR_CODES.NOT_FOUND) {
        logger.debug('👤 API: User not found for deletion', { id });
        return;
      }
      throw fetchError;
    }

    // Perform the hard delete
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('👤 API: Failed to delete user', {
        id,
        error: deleteError,
      });
      throw deleteError;
    }

    logger.info('👤 API: Successfully deleted user', { id });
  } catch (error) {
    logger.error('👤 API: Error deleting user', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}