import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { toDomainMembershipInfo } from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { CommunityMembershipRow } from '../types/communityRow';
import { CommunityMembership } from '../types';

export async function fetchUserCommunities(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CommunityMembership[]> {
  logger.debug('🏘️ API: Fetching user communities', { userId });

  try {
    const { data, error } = (await supabase
      .from('community_memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: CommunityMembershipRow[];
      error: Error | null;
    };

    if (error) {
      logger.error('🏘️ API: Failed to fetch user communities', {
        error,
        userId,
      });
      throw error;
    }

    const memberships: CommunityMembership[] = (data || []).map(
      (dbMembership) => toDomainMembershipInfo(dbMembership),
    );

    logger.debug('🏘️ API: Successfully fetched user communities', {
      userId,
      count: memberships.length,
    });
    return memberships;
  } catch (error) {
    logger.error('🏘️ API: Error fetching user communities', { error, userId });
    throw error;
  }
}
