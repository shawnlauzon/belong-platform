import { getBelongClient } from '@belongnetwork/core';
import { fetchCommunityById } from './fetchCommunityById';
import { forDbUpdate } from './communityTransformer';
import type { Community, CommunityData } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function updateCommunity(
  data: CommunityData & { id: string }
): Promise<Community> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Updating community', { id: data.id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const { id, ...updateData } = data;
    const dbUpdateData = forDbUpdate({ id, ...updateData });
    const updatePayload = {
      ...dbUpdateData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('communities')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      logger.error('🏘️ API: Failed to update community', { id, error });
      throw error;
    }

    // Fetch the updated community with joined data
    const community = await fetchCommunityById(id);
    if (!community) {
      throw new Error('Community not found after update');
    }
    logger.info('🏘️ API: Successfully updated community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error updating community', { id: data.id, error });
    throw error;
  }
}
