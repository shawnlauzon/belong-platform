import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { CommunityMembership, CommunityMembershipData } from '@belongnetwork/types';
import { toDomainMembership, forDbMembershipInsert } from './communityTransformer';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import { COMMUNITY_ERROR_MESSAGES } from '../constants';

export async function joinCommunity(
  communityId: string,
  role: 'member' | 'admin' | 'organizer' = 'member'
): Promise<CommunityMembership> {
  logger.debug('🏘️ API: Joining community', { communityId, role });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🏘️ API: User must be authenticated to join a community', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('community_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "No rows found" - which is what we want
      logger.error('🏘️ API: Failed to check existing membership', { error: checkError });
      throw checkError;
    }

    if (existingMembership) {
      logger.info('🏘️ API: User is already a member of this community', {
        userId,
        communityId,
      });
      throw new Error(COMMUNITY_ERROR_MESSAGES.ALREADY_MEMBER);
    }

    // Create membership data
    const membershipData: CommunityMembershipData = {
      userId,
      communityId,
      role,
    };

    // Transform to database format
    const dbMembership = forDbMembershipInsert(membershipData);

    // Insert membership
    const { data: createdMembership, error } = await supabase
      .from('community_memberships')
      .insert([dbMembership])
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community membership', { error });
      throw error;
    }

    // Note: member_count is automatically updated by database triggers

    // Transform to domain model (cache assembly pattern - let hooks fetch related data)
    const membership = toDomainMembership(createdMembership);

    logger.info('🏘️ API: Successfully joined community', {
      userId,
      communityId,
      role,
    });

    return membership;
  } catch (error) {
    logger.error('🏘️ API: Error joining community', { error, communityId });
    throw error;
  }
}