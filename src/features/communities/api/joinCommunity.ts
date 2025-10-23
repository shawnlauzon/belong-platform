import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityMembership } from '../types';
import {
  toDomainMembershipInfo,
  toCommunityMembershipInsertRow,
} from '../transformers/communityTransformer';
import { logger } from '@/shared';

export async function joinCommunity(
  supabase: SupabaseClient<Database>,
  userId: string,
  communityId: string,
): Promise<CommunityMembership> {
  logger.debug('🏘️ API: Joining community!', { communityId });

  try {
    const currentUserId = userId;

    // Check if user is already a member of this community
    const { data: existingMembership, error: checkError } = await supabase
      .from('community_memberships')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('community_id', communityId)
      .maybeSingle();

    if (checkError) {
      logger.error('🏘️ API: Failed to check existing membership', {
        error: checkError,
        communityId,
        userId: currentUserId,
      });
      throw checkError;
    }

    if (existingMembership) {
      const error = new Error('User is already a member of this community');
      logger.error('🏘️ API: User already a member', {
        communityId,
        userId: currentUserId,
      });
      throw error;
    }

    const membershipData = toCommunityMembershipInsertRow({
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
      throw new Error('No data returned after joining community');
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
