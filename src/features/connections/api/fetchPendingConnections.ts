import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ConnectionRequest } from '../types';
import { toDomainConnectionRequest } from '../transformers';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function fetchPendingConnections(
  supabase: SupabaseClient<Database>,
  communityId?: string,
): Promise<ConnectionRequest[]> {
  logger.debug('🔗 API: Fetching pending connection requests', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    let query = supabase
      .from('connection_requests')
      .select('*')
      .eq('initiator_id', currentUserId) // Only requests where user is the initiator (needs to approve)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Filter by community if specified
    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🔗 API: Error fetching pending connections', {
        error,
        communityId,
      });
      throw error;
    }

    if (!data) {
      return [];
    }

    const pendingRequests = data.map(toDomainConnectionRequest);

    logger.debug('🔗 API: Successfully fetched pending connections', {
      count: pendingRequests.length,
      communityId,
    });

    return pendingRequests;
  } catch (error) {
    logger.error('🔗 API: Error fetching pending connections', {
      error,
      communityId,
    });
    throw error;
  }
}