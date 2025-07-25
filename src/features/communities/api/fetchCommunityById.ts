import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community, CommunityRow } from '../types';
import { toDomainCommunity } from '../transformers/communityTransformer';
import { SELECT_COMMUNITY_BASIC } from '../types/communityRow';
import { logger } from '@/shared';

export async function fetchCommunityById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Community | null> {
  logger.debug('🏘️ API: Fetching community by ID', { id });

  try {
    const { data, error } = (await supabase
      .from('communities')
      .select(SELECT_COMMUNITY_BASIC)
      .eq('id', id)
      .single()) as {
      data: CommunityRow | null;
      error: QueryError | null;
    };

    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug('🏘️ API: Community not found', { id });
        return null;
      }
      logger.error('🏘️ API: Failed to fetch community', { error, id });
      throw error;
    }

    if (!data) {
      logger.debug('🏘️ API: Community not found', { id });
      return null;
    }

    const community = toDomainCommunity(data);

    logger.debug('🏘️ API: Successfully fetched community', {
      id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community by ID', { error, id });
    throw error;
  }
}
