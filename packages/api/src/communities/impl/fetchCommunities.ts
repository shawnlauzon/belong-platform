import { getBelongClient } from '@belongnetwork/core';
import { toDomainCommunity, toCommunityInfo } from './communityTransformer';
import type { Community, CommunityInfo } from '@belongnetwork/types';

export async function fetchCommunities(options?: { includeDeleted?: boolean }): Promise<CommunityInfo[]> {
  const { supabase, logger } = getBelongClient();

  logger.debug('🏘️ API: Fetching communities', { options });

  try {
    let query = supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    // By default, only fetch active communities
    if (!options?.includeDeleted) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🏘️ API: Failed to fetch communities', { error });
      throw error;
    }

    const communities: CommunityInfo[] = (data || []).map((dbCommunity) =>
      toCommunityInfo(dbCommunity)
    );

    logger.debug('🏘️ API: Successfully fetched communities', {
      count: communities.length,
      includeDeleted: options?.includeDeleted,
    });
    return communities;
  } catch (error) {
    logger.error('🏘️ API: Error fetching communities', { error });
    throw error;
  }
}
