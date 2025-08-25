import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { UserPublicInfo } from '../types';

export async function fetchUserPublicInfo(
  supabase: SupabaseClient<Database>,
  memberConnectionCode: string,
): Promise<UserPublicInfo | null> {
  logger.debug('👤 API: Fetching user public info by connection code', { memberConnectionCode });

  try {
    const { data, error } = await supabase.rpc('get_user_public_info_by_connection_code', {
      connection_code: memberConnectionCode,
    });

    if (error) {
      logger.error('👤 API: Failed to fetch user public info by connection code', { memberConnectionCode, error });
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('👤 API: User not found for connection code', { memberConnectionCode });
      return null;
    }

    const userRecord = data[0];
    const userPublicInfo: UserPublicInfo = {
      id: userRecord.id,
      firstName: userRecord.first_name || '',
      avatarUrl: userRecord.avatar_url || undefined,
    };

    logger.debug('👤 API: Successfully fetched user public info by connection code', {
      memberConnectionCode,
      firstName: userPublicInfo.firstName,
    });
    return userPublicInfo;
  } catch (error) {
    logger.error('👤 API: Error fetching user public info by connection code', {
      memberConnectionCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}