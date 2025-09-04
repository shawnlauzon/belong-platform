import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserConnection } from '../types';
import { toDomainUserConnection } from '../transformers';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function fetchUserConnections(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<UserConnection[]> {
  logger.debug('🔗 API: Fetching user connections', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const { data, error } = await supabase
      .from('user_connections')
      .select('*')
      .eq('community_id', communityId)
      .or(`user_id.eq.${currentUserId},other_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('🔗 API: Error fetching user connections', {
        error,
        communityId,
      });
      throw error;
    }

    if (!data) {
      return [];
    }

    const userConnections = data.map(toDomainUserConnection);

    logger.debug('🔗 API: Successfully fetched user connections', {
      count: userConnections.length,
      communityId,
    });

    return userConnections;
  } catch (error) {
    logger.error('🔗 API: Error fetching user connections', {
      error,
      communityId,
    });
    throw error;
  }
}