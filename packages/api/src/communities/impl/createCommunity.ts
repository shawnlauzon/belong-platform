import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community, CreateCommunityData } from '@belongnetwork/types';
import { AUTH_ERROR_MESSAGES } from '../../auth';

export async function createCommunity(
  data: CreateCommunityData
): Promise<Community> {
  logger.debug('🏘️ API: Creating community', { name: data.name });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    const { data: newCommunity, error } = await supabase
      .from('communities')
      .insert(data)
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community', { error });
      throw error;
    }

    const community = toDomainCommunity(newCommunity);
    logger.info('🏘️ API: Successfully created community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error creating community', { error });
    throw error;
  }
}
