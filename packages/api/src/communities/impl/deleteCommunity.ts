import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { AUTH_ERROR_MESSAGES } from '../../auth';

export async function deleteCommunity(id: string): Promise<void> {
  logger.debug('🏘️ API: Deleting community', { id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const { error } = await supabase.from('communities').delete().eq('id', id);

    if (error) {
      logger.error('🏘️ API: Failed to delete community', { id, error });
      throw error;
    }

    logger.info('🏘️ API: Successfully deleted community', { id });
  } catch (error) {
    logger.error('🏘️ API: Error deleting community', { id, error });
    throw error;
  }
}
