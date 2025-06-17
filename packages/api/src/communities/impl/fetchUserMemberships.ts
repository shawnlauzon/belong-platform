import { getBelongClient } from '@belongnetwork/core';
import type { CommunityMembership } from '@belongnetwork/types';
import { toDomainMembership } from './communityTransformer';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function fetchUserMemberships(userId?: string): Promise<CommunityMembership[]> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Fetching user memberships', { userId });

  try {
    let targetUserId = userId;

    // If no userId provided, get current user
    if (!targetUserId) {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error('🏘️ API: User must be authenticated or userId must be provided', {
          error: userError,
        });
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      targetUserId = userData.user.id;
    }

    const { data, error } = await supabase
      .from('community_memberships')
      .select(`
        *,
        community:communities(
          *,
          organizer:profiles(*)
        )
      `)
      .eq('user_id', targetUserId)
      .order('joined_at', { ascending: false });

    if (error) {
      logger.error('🏘️ API: Failed to fetch user memberships', { error });
      throw error;
    }

    const memberships: CommunityMembership[] = (data || []).map((dbMembership) =>
      toDomainMembership(dbMembership)
    );

    logger.debug('🏘️ API: Successfully fetched user memberships', {
      userId: targetUserId,
      count: memberships.length,
    });

    return memberships;
  } catch (error) {
    logger.error('🏘️ API: Error fetching user memberships', { error, userId });
    throw error;
  }
}