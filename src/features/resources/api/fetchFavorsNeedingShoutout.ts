import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch favors (requests) that the user accepted but hasn't sent shoutouts for yet.
 * Uses LEFT JOIN to find accepted favors where no shoutout exists.
 */
export async function fetchFavorsNeedingShoutout(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🙏 API: Fetching favors needing shoutout');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch favors needing shoutout');

    // Query for requests (favors) where:
    // 1. User has an accepted response to the request
    // 2. No shoutout exists from this user for this resource
    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        ${SELECT_RESOURCE_WITH_RELATIONS},
        resource_responses!inner(response),
        shoutouts!left(id)
      `)
      .eq('type', 'request')
      .eq('resource_responses.user_id', currentUserId)
      .eq('resource_responses.response', 'accepted')
      .is('shoutouts.id', null) // No shoutout exists
      .eq('shoutouts.from_user_id', currentUserId); // Left join condition

    if (error) {
      logger.error('🙏 API: Failed to fetch favors needing shoutout', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🙏 API: No favors needing shoutout found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(toDomainResource);

    logger.info('🙏 API: Successfully fetched favors needing shoutout', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🙏 API: Error fetching favors needing shoutout', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}