import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityFilter, Community } from '../types';
import { toDomainCommunity } from '../transformers/communityTransformer';
import { SELECT_COMMUNITY_WITH_RELATIONS } from '../types/communityRow';
import { logger } from '@/shared';

export async function fetchCommunities(
  supabase: SupabaseClient<Database>,
  filter?: CommunityFilter,
): Promise<Community[]> {
  logger.debug('🏘️ API: Fetching communities', { filter });

  try {
    let query = supabase
      .from('communities')
      .select(SELECT_COMMUNITY_WITH_RELATIONS)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filter?.name) {
      query = query.ilike('name', `%${filter.name}%`);
    }
    if (filter?.organizerId) {
      query = query.eq('organizer_id', filter.organizerId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🏘️ API: Failed to fetch communities', { error });
      throw error;
    }

    const communities: Community[] = (data || []).map((dbCommunity) => {
      return toDomainCommunity(dbCommunity);
    });

    logger.debug('🏘️ API: Successfully fetched communities', {
      count: communities.length,
      filter,
    });
    return communities;
  } catch (error) {
    logger.error('🏘️ API: Error fetching communities', { error });
    throw error;
  }
}
