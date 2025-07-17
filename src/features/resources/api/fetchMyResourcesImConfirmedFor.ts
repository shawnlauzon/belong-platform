import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch resources where I have approved claims.
 * These represent events/resources I am confirmed to attend or participate in.
 */
export async function fetchMyResourcesImConfirmedFor(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('✅ API: Fetching resources I am confirmed for');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch resources I am confirmed for');

    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        ${SELECT_RESOURCE_WITH_RELATIONS},
        resource_claims!inner(status)
      `)
      .eq('resource_claims.user_id', currentUserId)
      .eq('resource_claims.status', 'approved')
      .eq('status', 'open');

    if (error) {
      logger.error('✅ API: Failed to fetch resources I am confirmed for', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('✅ API: No resources I am confirmed for found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('✅ API: Successfully fetched resources I am confirmed for', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('✅ API: Error fetching resources I am confirmed for', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}