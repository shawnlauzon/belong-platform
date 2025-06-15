import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community, CommunityData } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function updateCommunity(
  data: CommunityData & { id: string }
): Promise<Community> {
  logger.debug('🏘️ API: Updating community', { id: data.id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const { id, ...updateData } = data;
    const updatePayload = {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedCommunity, error } = await supabase
      .from('communities')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to update community', { id, error });
      throw error;
    }

    const community = toDomainCommunity(updatedCommunity);
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
