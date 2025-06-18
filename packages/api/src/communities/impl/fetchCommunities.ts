import { getBelongClient } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community } from '@belongnetwork/types';

export async function fetchCommunities(options?: { includeDeleted?: boolean }): Promise<Community[]> {
  const { supabase, logger } = getBelongClient();

  logger.debug('🏘️ API: Fetching communities', { options });

  try {
    let query = supabase
      .from('communities')
      .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
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

    const communities: Community[] = (data || []).map((dbCommunity) =>
      toDomainCommunity(dbCommunity)
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
