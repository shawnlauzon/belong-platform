import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch offers that the user has completed claims for but hasn't sent shoutouts for yet.
 * Uses two queries to work around Supabase's LEFT JOIN limitations.
 */
export async function fetchOffersNeedingShoutout(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🎁 API: Fetching offers needing shoutout');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch offers needing shoutout');

    // Step 1: Get all offers that the user has completed claims for
    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        ${SELECT_RESOURCE_WITH_RELATIONS},
        resource_claims!inner(status)
      `)
      .eq('type', 'offer')
      .eq('resource_claims.user_id', currentUserId)
      .eq('resource_claims.status', 'completed');

    if (error) {
      logger.error('🎁 API: Failed to fetch offers needing shoutout', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🎁 API: No offers with completed claims found');
      return [];
    }

    // Step 2: Get all shoutouts from the current user for these resources
    const resourceIds = resources.map((r) => r.id);
    const { data: shoutouts, error: shoutoutError } = await supabase
      .from('shoutouts')
      .select('resource_id')
      .eq('from_user_id', currentUserId)
      .in('resource_id', resourceIds);

    if (shoutoutError) {
      logger.error('🎁 API: Failed to fetch existing shoutouts', { 
        error: shoutoutError 
      });
      throw shoutoutError;
    }

    // Step 3: Filter out resources that already have shoutouts
    const shoutoutResourceIds = new Set(shoutouts?.map((s) => s.resource_id) || []);
    const resourcesNeedingShoutout = resources.filter(
      (r) => !shoutoutResourceIds.has(r.id),
    );

    if (resourcesNeedingShoutout.length === 0) {
      logger.debug('🎁 API: No offers needing shoutout found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resourcesNeedingShoutout.map(r => 
      toDomainResource(r)
    );

    logger.info('🎁 API: Successfully fetched offers needing shoutout', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🎁 API: Error fetching offers needing shoutout', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}