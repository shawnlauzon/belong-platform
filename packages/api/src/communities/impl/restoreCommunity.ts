import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import type { Community } from '@belongnetwork/types';
import { fetchCommunityById } from './fetchCommunityById';

export async function restoreCommunity(id: string): Promise<Community> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Restoring soft deleted community', { id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    // Check if user is the organizer of the community and if it's deleted
    const { data: community, error: fetchError } = await supabase
      .from('communities')
      .select('organizer_id, is_active')
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('🏘️ API: Failed to fetch community for restore authorization', { id, error: fetchError });
      throw fetchError;
    }

    if (!community) {
      throw new Error('Community not found');
    }

    if (community.organizer_id !== user.id) {
      throw new Error('Only community organizers can restore communities');
    }

    if (community.is_active) {
      throw new Error('Community is not deleted and cannot be restored');
    }

    // Perform restore (reverse soft delete)
    const { error } = await supabase
      .from('communities')
      .update({
        is_active: true,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('🏘️ API: Failed to restore community', { id, error });
      throw error;
    }

    // Fetch the restored community to return
    const restoredCommunity = await fetchCommunityById(id);
    if (!restoredCommunity) {
      throw new Error('Failed to fetch restored community');
    }

    logger.info('🏘️ API: Successfully restored community', { 
      id, 
      name: restoredCommunity.name,
      restoredBy: user.id 
    });
    
    return restoredCommunity;
  } catch (error) {
    logger.error('🏘️ API: Error restoring community', { id, error });
    throw error;
  }
}