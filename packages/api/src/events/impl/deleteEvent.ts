import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function deleteEvent(id: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🎉 API: Deleting event', { id });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🎉 API: User must be authenticated to delete an event', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Delete from database (only if user is the organizer)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('organizer_id', userId); // Only allow organizer to delete

    if (error) {
      logger.error('🎉 API: Failed to delete event', { id, error });
      throw error;
    }

    logger.info('🎉 API: Successfully deleted event', { id });
  } catch (error) {
    logger.error('🎉 API: Error deleting event', { id, error });
    throw error;
  }
}