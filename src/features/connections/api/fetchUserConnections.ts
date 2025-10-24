import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserConnection } from '../types';
import { toDomainUserConnection } from '../transformers';
import { logger } from '@/shared';

export async function fetchUserConnections(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserConnection[]> {
  logger.debug('🔗 API: Fetching user connections', { userId });

  try {
    const currentUserId = userId;

    const { data: connections, error } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('🔗 API: Failed to fetch user connections', {
        error,
        userId: currentUserId,
      });
      throw error;
    }

    const userConnections = connections.map(toDomainUserConnection);
    logger.debug('🔗 API: Found user connections', {
      userId,
      count: userConnections.length,
    });
    return userConnections;
  } catch (error) {
    logger.error('🔗 API: Error fetching user connections', {
      error,
      userId,
    });
    throw error;
  }
}