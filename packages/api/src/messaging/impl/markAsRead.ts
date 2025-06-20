import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function markAsRead(messageId: string): Promise<void> {
  const { supabase, logger } = getBelongClient();

  logger.debug('💬 API: Marking message as read', { messageId });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('💬 API: User must be authenticated to mark message as read', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Update message read_at timestamp
    // Only allow marking messages as read if the current user is the recipient
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('to_user_id', userId); // Security: only allow reading own messages

    if (error) {
      logger.error('💬 API: Failed to mark message as read', { error, messageId });
      throw error;
    }

    logger.info('💬 API: Successfully marked message as read', { messageId });
  } catch (error) {
    logger.error('💬 API: Error marking message as read', { error, messageId });
    throw error;
  }
}