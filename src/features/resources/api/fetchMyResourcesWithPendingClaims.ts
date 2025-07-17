import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch resources I own that have pending claims from other users.
 * These represent offers/requests that need my approval.
 */
export async function fetchMyResourcesWithPendingClaims(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('📋 API: Fetching my resources with pending claims');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch my resources with pending claims');

    const { data: resources, error } = await supabase
      .from('resources')
      .select(`
        ${SELECT_RESOURCE_WITH_RELATIONS},
        resource_claims!inner(status)
      `)
      .eq('owner_id', currentUserId)
      .eq('resource_claims.status', 'pending')
      .eq('status', 'open');

    if (error) {
      logger.error('📋 API: Failed to fetch my resources with pending claims', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('📋 API: No resources with pending claims found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('📋 API: Successfully fetched my resources with pending claims', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('📋 API: Error fetching my resources with pending claims', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}