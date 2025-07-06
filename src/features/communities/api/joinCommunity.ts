import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityMembershipInfo } from '../types';
import {
  toDomainMembershipInfo,
  forDbMembershipInsert,
} from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function joinCommunity(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<CommunityMembershipInfo | null> {
  logger.debug('🏘️ API: Joining community', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const membershipData = forDbMembershipInsert({
      userId: currentUserId,
      communityId,
    });

    const { data, error } = await supabase
      .from('community_memberships')
      .insert(membershipData)
      .select()
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to join community', {
        error,
        communityId,
      });
      throw error;
    }

    if (!data) {
      logger.error('🏘️ API: No data returned after joining community');
      return null;
    }

    const membership = toDomainMembershipInfo(data);

    logger.debug('🏘️ API: Successfully joined community', {
      communityId,
      userId: currentUserId,
    });
    return membership;
  } catch (error) {
    logger.error('🏘️ API: Error joining community', {
      error,
      communityId,
    });
    throw error;
  }
}
