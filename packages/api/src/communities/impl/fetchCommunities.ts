import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community } from '@belongnetwork/types';

export async function fetchCommunities(): Promise<Community[]> {
  logger.debug('🏘️ API: Fetching communities');

  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('🏘️ API: Failed to fetch communities', { error });
      throw error;
    }

    const communities: Community[] = (data || []).map((dbCommunity) =>
      toDomainCommunity(dbCommunity)
    );

    logger.debug('🏘️ API: Successfully fetched communities', {
      count: communities.length,
    });
    return communities;
  } catch (error) {
    logger.error('🏘️ API: Error fetching communities', { error });
    throw error;
  }
}
