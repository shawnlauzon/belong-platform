import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch event resources I own that are upcoming and need organizing.
 * These represent events I am organizing that need management.
 */
export async function fetchMyResourcesImOrganizing(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🎪 API: Fetching resources I am organizing');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch resources I am organizing');


    const { data: resources, error } = await supabase
      .from('resources')
      .select(SELECT_RESOURCE_WITH_RELATIONS)
      .eq('owner_id', currentUserId)
      .eq('category', 'event')
      .eq('status', 'open');

    if (error) {
      logger.error('🎪 API: Failed to fetch resources I am organizing', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🎪 API: No resources I am organizing found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('🎪 API: Successfully fetched resources I am organizing', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🎪 API: Error fetching resources I am organizing', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}