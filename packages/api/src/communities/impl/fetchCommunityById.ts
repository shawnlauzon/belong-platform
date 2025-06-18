import { getBelongClient } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community } from '@belongnetwork/types';

export async function fetchCommunityById(
  id: string
): Promise<Community | null> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Fetching community by ID', { id });

  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
      .eq('id', id)
      .single();

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
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community by ID', { id, error });
    throw error;
  }
}
