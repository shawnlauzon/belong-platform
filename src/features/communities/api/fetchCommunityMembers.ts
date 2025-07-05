import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityMembershipInfo } from '../types';
import { toDomainMembershipInfo } from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { CommunityMembershipRow } from '../types/database';

export async function fetchCommunityMembers(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<CommunityMembershipInfo[]> {
  logger.debug('🏘️ API: Fetching community members', { communityId });

  try {
    const { data, error } = (await supabase
      .from('community_memberships')
      .select(
        `
        *,
        user:profiles(*)
      `,
      )
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })) as {
      data: CommunityMembershipRow[];
      error: Error | null;
    };

    if (error) {
      logger.error('🏘️ API: Failed to fetch community members', {
        error,
        communityId,
      });
      throw error;
    }

    const memberships: CommunityMembershipInfo[] = (data || []).map(
      (dbMembership) => toDomainMembershipInfo(dbMembership),
    );

    logger.debug('🏘️ API: Successfully fetched community members', {
      communityId,
      count: memberships.length,
    });
    return memberships;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community members', {
      error,
      communityId,
    });
    throw error;
  }
}
