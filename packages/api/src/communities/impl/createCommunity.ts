import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { forDbInsert, toDomainCommunity } from './communityTransformer';
import type { Community, CommunityData } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function createCommunity(
  data: CommunityData,
  { parent }: { parent: Community }
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
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community', { error });
      throw error;
    }

    const community = toDomainCommunity(newCommunity, {
      organizer: user,
      parent,
    });
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
