import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function leaveEvent(eventId: string): Promise<void> {
  logger.debug('🎉 API: Leaving event', { eventId });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🎉 API: User must be authenticated to leave an event', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Delete attendance record
    const { error } = await supabase
      .from('event_attendances')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      logger.error('🎉 API: Failed to leave event', { eventId, error });
      throw error;
    }

    logger.info('🎉 API: Successfully left event', { eventId, userId });
  } catch (error) {
    logger.error('🎉 API: Error leaving event', { eventId, error });
    throw error;
  }
}