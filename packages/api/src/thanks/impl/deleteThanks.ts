import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

/**
 * Deletes a thanks by ID if the current user is the creator
 * @param id The ID of the thanks to delete
 * @returns void if successful
 * @throws {Error} If user is not authenticated, not authorized, or other error occurs
 */
export async function deleteThanks(id: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🙏 API: Deleting thanks', { id });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🙏 API: User must be authenticated to delete thanks', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // First, fetch the existing thanks to verify ownership
    const { data: existingThanks, error: fetchError } = await supabase
      .from('thanks')
      .select('from_user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Thanks not found - we can consider this a success
        logger.debug('🙏 API: Thanks not found for deletion', { id });
        return;
      }

      logger.error('🙏 API: Failed to fetch thanks for deletion', {
        id,
        error: fetchError.message,
        code: fetchError.code,
      });
      throw fetchError;
    }

    // Check if the current user is the creator
    if (existingThanks.from_user_id !== userId) {
      logger.error('🙏 API: User is not authorized to delete this thanks', {
        userId,
        fromUserId: existingThanks.from_user_id,
        thanksId: id,
      });
      throw new Error('You are not authorized to delete this thanks');
    }

    // Perform the hard delete
    const { error: deleteError } = await supabase
      .from('thanks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('🙏 API: Failed to delete thanks', {
        id,
        error: deleteError.message,
        code: deleteError.code,
      });
      throw deleteError;
    }

    logger.info('🙏 API: Successfully deleted thanks', { id });

    return;
  } catch (error) {
    logger.error('🙏 API: Error deleting thanks', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}