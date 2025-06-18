import { getBelongClient } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community } from '@belongnetwork/types';

export async function fetchCommunityById(
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<Community | null> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Fetching community by ID', { id, options });

  try {
    let query = supabase
      .from('communities')
      .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
      .eq('id', id);

    // By default, only fetch active communities
    if (!options?.includeDeleted) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Community not found
      }
      throw error;
    }

    const community = toDomainCommunity(data);
    logger.debug('🏘️ API: Successfully fetched community', {
      id,
      name: community.name,
      isActive: community.isActive,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community by ID', { id, error });
    throw error;
  }
}
