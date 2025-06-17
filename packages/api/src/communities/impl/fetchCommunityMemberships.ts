import { getBelongClient } from '@belongnetwork/core';
import type { CommunityMembership } from '@belongnetwork/types';
import { toDomainMembership } from './communityTransformer';

export async function fetchCommunityMemberships(communityId: string): Promise<CommunityMembership[]> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Fetching community memberships', { communityId });

  try {
    const { data, error } = await supabase
      .from('community_memberships')
      .select(`
        *,
        user:profiles!inner(*)
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error) {
      logger.error('🏘️ API: Failed to fetch community memberships', { error });
      throw error;
    }

    const memberships: CommunityMembership[] = (data || []).map((dbMembership) =>
      toDomainMembership(dbMembership)
    );

    logger.debug('🏘️ API: Successfully fetched community memberships', {
      communityId,
      count: memberships.length,
    });

    return memberships;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community memberships', { error, communityId });
    throw error;
  }
}