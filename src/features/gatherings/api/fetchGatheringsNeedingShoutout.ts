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
    const currentUserId = await getAuthIdOrThrow(
      supabase,
      'fetch gatherings needing shoutout',
    );

    // Step 1: Get gatherings the user attended that have ended
    // For gatherings to be "ended", either:
    // - end_date_time is in the past, OR
    // - start_date_time is in the past AND end_date_time is null
    const now = new Date().toISOString();
    const { data: gatherings, error } = await supabase
      .from('gatherings')
      .select(
        `
        ${SELECT_GATHERING_WITH_RELATIONS},
        gathering_responses!inner(status)
      `,
      )
      .eq('gathering_responses.user_id', currentUserId)
      .eq('gathering_responses.status', 'attending')
      .neq('organizer_id', currentUserId)
      .or(`end_date_time.lt.${now},and(end_date_time.is.null,start_date_time.lt.${now})`); // Gathering has ended

    if (error) {
      logger.error('🎉 API: Failed to fetch gatherings needing shoutout', {
        error,
      });
      throw error;
    }

    if (!gatherings || gatherings.length === 0) {
      logger.debug('🎉 API: No attended gatherings found');
      return [];
    }

    // Step 2: Get existing shoutouts from the user for these gatherings
    const gatheringIds = gatherings.map((g) => g.id);
    const { data: shoutouts, error: shoutoutError } = await supabase
      .from('shoutouts')
      .select('gathering_id')
      .eq('from_user_id', currentUserId)
      .in('gathering_id', gatheringIds);

    if (shoutoutError) {
      logger.error('🎉 API: Failed to fetch existing shoutouts', {
        error: shoutoutError,
      });
      throw shoutoutError;
    }

    // Step 3: Filter out gatherings that already have shoutouts
    const shoutoutGatheringIds = new Set(shoutouts?.map((s) => s.gathering_id) || []);
    const gatheringsNeedingShoutout = gatherings.filter(
      (g) => !shoutoutGatheringIds.has(g.id),
    );

    if (gatheringsNeedingShoutout.length === 0) {
      logger.debug('🎉 API: No gatherings needing shoutout found');
      return [];
    }

    // Transform to domain objects
    const domainGatherings = gatheringsNeedingShoutout.map(toGatheringWithJoinedRelations);

    logger.info('🎉 API: Successfully fetched gatherings needing shoutout', {
      count: domainGatherings.length,
      gatheringIds: domainGatherings.map((g) => g.id),
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
