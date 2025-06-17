import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import { COMMUNITY_ERROR_MESSAGES } from '../constants';

export async function leaveCommunity(communityId: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🏘️ API: Leaving community', { communityId });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🏘️ API: User must be authenticated to leave a community', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Check if user is a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('community_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // No rows found - user is not a member
        logger.info('🏘️ API: User is not a member of this community', {
          userId,
          communityId,
        });
        throw new Error(COMMUNITY_ERROR_MESSAGES.NOT_MEMBER);
      }
      logger.error('🏘️ API: Failed to check existing membership', { error: checkError });
      throw checkError;
    }

    // Check if user is the organizer - they cannot leave their own community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('organizer_id')
      .eq('id', communityId)
      .single();

    if (communityError) {
      logger.error('🏘️ API: Failed to fetch community details', { error: communityError });
      throw communityError;
    }

    if (community.organizer_id === userId) {
      logger.info('🏘️ API: Organizer cannot leave their own community', {
        userId,
        communityId,
      });
      throw new Error(COMMUNITY_ERROR_MESSAGES.ORGANIZER_CANNOT_LEAVE);
    }

    // Delete membership
    const { error: deleteError } = await supabase
      .from('community_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('community_id', communityId);

    if (deleteError) {
      logger.error('🏘️ API: Failed to delete community membership', { error: deleteError });
      throw deleteError;
    }

    // Note: member_count is automatically updated by database triggers

    logger.info('🏘️ API: Successfully left community', {
      userId,
      communityId,
    });
  } catch (error) {
    logger.error('🏘️ API: Error leaving community', { error, communityId });
    throw error;
  }
}