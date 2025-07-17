import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch resources where I have "interested" claims.
 * These represent events/resources I'm interested in but not yet confirmed for.
 */
export async function fetchMyResourcesImInterestedIn(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🤔 API: Fetching resources I am interested in');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch resources I am interested in');

    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        ${SELECT_RESOURCE_WITH_RELATIONS},
        resource_claims!inner(status)
      `)
      .eq('resource_claims.user_id', currentUserId)
      .eq('resource_claims.status', 'interested')
      .eq('status', 'open');

    if (error) {
      logger.error('🤔 API: Failed to fetch resources I am interested in', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🤔 API: No resources I am interested in found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('🤔 API: Successfully fetched resources I am interested in', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🤔 API: Error fetching resources I am interested in', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}