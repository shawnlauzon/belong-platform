import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityMembershipInfo } from '../types';
import { toDomainMembershipInfo } from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { CommunityMembershipRow } from '../types/database';

export async function fetchUserCommunities(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CommunityMembershipInfo[]> {
  logger.debug('🏘️ API: Fetching user communities', { userId });

  try {
    const { data, error } = (await supabase
      .from('community_memberships')
      .select(
        `
        *,
        community:communities(
          *,
          organizer:users(*)
        )
      `,
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })) as {
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

    const memberships: CommunityMembershipInfo[] = (data || []).map(
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
