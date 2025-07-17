import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch resources I own that are not expired (created within 2 weeks).
 * These represent my active offers/requests that need management.
 */
export async function fetchMyActiveResources(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🔄 API: Fetching my active resources');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch my active resources');
    
    // Calculate date 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: resources, error } = await supabase
      .from('resources')
      .select(SELECT_RESOURCE_WITH_RELATIONS)
      .eq('owner_id', currentUserId)
      .eq('status', 'open')
      .gte('created_at', twoWeeksAgo.toISOString());

    if (error) {
      logger.error('🔄 API: Failed to fetch my active resources', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🔄 API: No active resources found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('🔄 API: Successfully fetched my active resources', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🔄 API: Error fetching my active resources', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}