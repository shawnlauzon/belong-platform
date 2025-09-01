import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import type { ConnectionDetails } from '../types';
import type { UserSummary } from '@/features/users/types';

export async function fetchConnectionDetails(
  supabase: SupabaseClient<Database>,
  memberConnectionCode: string,
): Promise<ConnectionDetails | null> {
  logger.debug('🔗 API: Fetching connection details by code', {
    memberConnectionCode,
  });

  try {
    const { data, error } = await supabase.rpc('get_connection_details', {
      connection_code: memberConnectionCode,
    });

    if (error) {
      logger.error('🔗 API: Failed to fetch connection details by code', {
        memberConnectionCode,
        error,
      });
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('🔗 API: Connection not found for code', {
        memberConnectionCode,
      });
      return null;
    }

    const connectionRecord = data[0];
    
    // Construct UserSummary keeping fields separate as in public_profiles
    const user: UserSummary = {
      id: connectionRecord.user_id,
      firstName: connectionRecord.first_name || undefined,
      lastName: connectionRecord.last_name || undefined,
      fullName: connectionRecord.full_name || undefined,
      avatarUrl: connectionRecord.avatar_url || undefined,
    };

    const connectionDetails: ConnectionDetails = {
      user,
      communityId: connectionRecord.community_id,
      isActive: connectionRecord.is_active,
      createdAt: new Date(connectionRecord.created_at),
    };

    logger.debug('🔗 API: Successfully fetched connection details by code', {
      memberConnectionCode,
      communityId: connectionDetails.communityId,
      firstName: connectionDetails.user.firstName,
    });
    return connectionDetails;
  } catch (error) {
    logger.error('🔗 API: Error fetching connection details by code', {
      memberConnectionCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
