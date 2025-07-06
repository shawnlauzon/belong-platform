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

    // Check if user is organizer - organizers cannot leave their own community
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

    if (membership.user_id === currentUserId) {
      logger.error('🏘️ API: Organizer cannot leave their own community', {
        communityId,
        userId: currentUserId,
      });
      throw new Error(MESSAGE_ORGANIZER_CANNOT_LEAVE);
    }

    const { error } = await supabase
      .from('community_memberships')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', currentUserId);

    if (error) {
      logger.error('🏘️ API: Failed to leave community', { error, communityId });
      throw error;
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
