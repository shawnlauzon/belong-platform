import { logger } from '../../../shared';
import { ERROR_CODES } from '../../../shared/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInfo } from '../types';
import { ShoutoutRow } from '../types/database';
import { toShoutoutInfo } from '../transformers/shoutoutsTransformer';

/**
 * Fetches a single shoutout by ID and returns ShoutoutInfo (lightweight with ID references)
 */
export async function fetchShoutoutInfoById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ShoutoutInfo | null> {
  logger.debug('📢 API: Fetching shoutout info by ID', { id });

  try {
    const { data, error } = await supabase
      .from('shoutouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === ERROR_CODES.NOT_FOUND) {
        logger.debug('📢 API: Shoutout not found', { id });
        return null;
      }
      logger.error('📢 API: Failed to fetch shoutout', { id, error });
      throw error;
    }

    const shoutoutInfo = toShoutoutInfo(
      data as ShoutoutRow,
      data.from_user_id,
      data.to_user_id,
      data.resource_id,
    );

    logger.debug('📢 API: Successfully fetched shoutout info', {
      id,
      fromUserId: shoutoutInfo.fromUserId,
      toUserId: shoutoutInfo.toUserId,
      resourceId: shoutoutInfo.resourceId,
    });

    return shoutoutInfo;
  } catch (error) {
    logger.error('📢 API: Error fetching shoutout info', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}