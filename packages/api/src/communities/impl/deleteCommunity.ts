import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function deleteCommunity(id: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Soft deleting community', { id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    // Check if user is the organizer of the community
    const { data: community, error: fetchError } = await supabase
      .from('communities')
      .select('organizer_id, is_active')
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('🏘️ API: Failed to fetch community for delete authorization', { id, error: fetchError });
      throw fetchError;
    }

    if (!community) {
      throw new Error('Community not found');
    }

    if (community.organizer_id !== user.id) {
      throw new Error('Only community organizers can delete communities');
    }

    if (!community.is_active) {
      throw new Error('Community is already deleted');
    }

    // Perform soft delete
    const { error } = await supabase
      .from('communities')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('🏘️ API: Failed to soft delete community', { id, error });
      throw error;
    }

    logger.info('🏘️ API: Successfully soft deleted community', { 
      id,
      deletedBy: user.id 
    });
    
    return;
  } catch (error) {
    logger.error('🏘️ API: Error soft deleting community', { id, error });
    throw error;
  }
}
