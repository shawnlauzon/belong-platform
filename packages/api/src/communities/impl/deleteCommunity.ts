import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function deleteCommunity(id: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Deleting community', { id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
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
