import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community, UpdateCommunityData } from '@belongnetwork/types';
import { AUTH_ERROR_MESSAGES } from '../../auth';

export async function updateCommunity(
  data: UpdateCommunityData
): Promise<Community> {
  logger.debug('🏘️ API: Updating community', { id: data.id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
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
