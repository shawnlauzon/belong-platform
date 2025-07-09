import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInfo, ShoutoutFilter } from '../types';
import { toShoutoutInfo } from '../transformers/shoutoutsTransformer';

/**
 * Fetches shoutouts with optional filtering
 */
export async function fetchShoutouts(
  supabase: SupabaseClient<Database>,
  filters?: ShoutoutFilter,
): Promise<ShoutoutInfo[]> {
  logger.debug('📢 API: Fetching shoutouts', { filters });

  try {
    let query = supabase
      .from('shoutouts')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.sentBy) {
        query = query.eq('from_user_id', filters.sentBy);
      }
      if (filters.receivedBy) {
        query = query.eq('to_user_id', filters.receivedBy);
      }
      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('📢 API: Failed to fetch shoutouts', { error });
      return [];
    }

    if (!data) {
      return [];
    }

    // Convert to ShoutoutInfo objects
    const shoutouts = data
      .map((dbShoutout) => {
        try {
          return toShoutoutInfo(
            dbShoutout,
            dbShoutout.from_user_id,
            dbShoutout.to_user_id,
            dbShoutout.resource_id,
          );
        } catch (error) {
          logger.error('📢 API: Error transforming shoutout', {
            shoutoutId: dbShoutout.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((shoutout): shoutout is ShoutoutInfo => shoutout !== null);

    logger.debug('📢 API: Successfully fetched shoutouts', {
      count: shoutouts.length,
      filters,
    });

    return shoutouts;
  } catch (error) {
    logger.error('📢 API: Error fetching shoutouts', {
      filters,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}