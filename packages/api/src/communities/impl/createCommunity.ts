import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { forDbInsert, toDomainCommunity } from './communityTransformer';
import type { Community, CommunityData } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import { fetchCommunityById } from './fetchCommunityById';

export async function createCommunity(
  data: CommunityData
): Promise<Community> {
  logger.debug('🏘️ API: Creating community', { name: data.name });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const { data: newCommunity, error } = await supabase
      .from('communities')
      .insert(forDbInsert(data))
      .select('id')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community', { error });
      throw error;
    }

    // Fetch the complete community with organizer data
    const community = await fetchCommunityById(newCommunity.id);
    if (!community) {
      throw new Error('Failed to fetch created community');
    }

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
