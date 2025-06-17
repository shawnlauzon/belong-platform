import { supabase, logger } from '@belongnetwork/core';
import type { BelongClient } from '@belongnetwork/core';
import { toDomainCommunity } from './communityTransformer';
import type { Community } from '@belongnetwork/types';

export async function fetchCommunities(client?: BelongClient): Promise<Community[]> {
  // Use provided client or fall back to singleton
  const supabaseClient = client?.supabase || supabase;
  const loggerClient = client?.logger || logger;

  loggerClient.debug('🏘️ API: Fetching communities');

  try {
    const { data, error } = await supabaseClient
      .from('communities')
      .select('*, organizer:profiles(*), parent:communities(*, organizer:profiles(*))')
      .order('created_at', { ascending: false });

    if (error) {
      loggerClient.error('🏘️ API: Failed to fetch communities', { error });
      throw error;
    }

    const communities: Community[] = (data || []).map((dbCommunity) =>
      toDomainCommunity(dbCommunity)
    );

    loggerClient.debug('🏘️ API: Successfully fetched communities', {
      count: communities.length,
    });
    return communities;
  } catch (error) {
    loggerClient.error('🏘️ API: Error fetching communities', { error });
    throw error;
  }
}
