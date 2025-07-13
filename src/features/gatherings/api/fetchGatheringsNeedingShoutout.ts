import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import type { Gathering } from '../types';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

/**
 * Fetch gatherings that the user attended but hasn't sent shoutouts for yet.
 * Uses LEFT JOIN to find completed gatherings where user said "yes" but no shoutout exists.
 */
export async function fetchGatheringsNeedingShoutout(
  supabase: SupabaseClient<Database>,
): Promise<Gathering[]> {
  logger.debug('🎉 API: Fetching gatherings needing shoutout');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch gatherings needing shoutout');

    // Query for completed gatherings where:
    // 1. User responded "yes" 
    // 2. Gathering is completed (ended)
    // 3. No shoutout exists from this user for this gathering
    const { data: gatherings, error } = await supabase
      .from('gatherings')
      .select(`
        ${SELECT_GATHERING_WITH_RELATIONS},
        gathering_responses!inner(status),
        shoutouts!left(id)
      `)
      .eq('gathering_responses.user_id', currentUserId)
      .eq('gathering_responses.status', 'yes')
      .lt('end_time', new Date().toISOString()) // Gathering has ended
      .is('shoutouts.id', null) // No shoutout exists
      .eq('shoutouts.from_user_id', currentUserId); // Left join condition

    if (error) {
      logger.error('🎉 API: Failed to fetch gatherings needing shoutout', { error });
      throw error;
    }

    if (!gatherings || gatherings.length === 0) {
      logger.debug('🎉 API: No gatherings needing shoutout found');
      return [];
    }

    // Transform to domain objects
    const domainGatherings = gatherings.map(toGatheringWithJoinedRelations);

    logger.info('🎉 API: Successfully fetched gatherings needing shoutout', {
      count: domainGatherings.length,
      gatheringIds: domainGatherings.map(g => g.id),
    });

    return domainGatherings;
  } catch (error) {
    logger.error('🎉 API: Error fetching gatherings needing shoutout', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}