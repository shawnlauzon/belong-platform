import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { toDomainResource } from '../transformers/resourceTransformer';
import type { Resource } from '../types';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

/**
 * Fetch resources where I have accepted claims that are ready for me to complete.
 * These represent offers/requests I claimed that have been approved and are ready to be fulfilled.
 */
export async function fetchMyAcceptedClaims(
  supabase: SupabaseClient<Database>,
): Promise<Resource[]> {
  logger.debug('🎯 API: Fetching my accepted claims');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch my accepted claims');

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
      logger.error('🎯 API: Failed to fetch my accepted claims', { error });
      throw error;
    }

    if (!resources || resources.length === 0) {
      logger.debug('🎯 API: No accepted claims found');
      return [];
    }

    // Transform to domain objects
    const domainResources = resources.map(r => 
      toDomainResource(r)
    );

    logger.info('🎯 API: Successfully fetched my accepted claims', {
      count: domainResources.length,
      resourceIds: domainResources.map(r => r.id),
    });

    return domainResources;
  } catch (error) {
    logger.error('🎯 API: Error fetching my accepted claims', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}