import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { MESSAGE_ORGANIZER_CANNOT_LEAVE } from '@/shared/constants';

export async function leaveCommunity(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<void> {
  logger.debug('🏘️ API: Leaving community', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Check if user is a member
    const { data: membership } = await supabase
      .from('community_memberships')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (!membership) {
      logger.error('🏘️ API: User is not a member of community', {
        communityId,
        userId: currentUserId,
      });
      throw new Error('User is not a member of community');
    }

    // Check if user is the organizer - organizers cannot leave their own community
    const { data: community } = await supabase
      .from('communities')
      .select('organizer_id')
      .eq('id', communityId)
      .single();

    if (community?.organizer_id === currentUserId) {
      logger.error('🏘️ API: Organizer cannot leave their own community', {
        communityId,
        userId: currentUserId,
      });
      throw new Error(MESSAGE_ORGANIZER_CANNOT_LEAVE);
    }

    // Delete the membership
    const { error: membershipError } = await supabase
      .from('community_memberships')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', currentUserId);

    if (membershipError) {
      logger.error('🏘️ API: Failed to leave community', { error: membershipError, communityId });
      throw membershipError;
    }

    // Also delete the connection code to prevent conflicts when rejoining
    const { error: codeError } = await supabase
      .from('community_member_codes')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', currentUserId);

    if (codeError) {
      logger.error('🏘️ API: Failed to delete connection code', { error: codeError, communityId });
      // Don't throw here - leaving the community succeeded, code cleanup is secondary
    }

    logger.debug('🏘️ API: Successfully left community', {
      communityId,
      userId: currentUserId,
    });
  } catch (error) {
    logger.error('🏘️ API: Error leaving community', { error, communityId });
    throw error;
  }
}
