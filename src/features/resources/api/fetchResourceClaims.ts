import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { appendQueries, logger } from '@/shared';
import { ResourceClaim, ResourceClaimFilter } from '../types';
import { toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRowJoinResource,
  SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE,
} from '../types/resourceRow';

export async function fetchResourceClaims(
  supabase: SupabaseClient<Database>,
  filter?: ResourceClaimFilter,
): Promise<ResourceClaim[]> {
  let query = supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE);

  if (filter) {
    query = appendQueries(query, {
      claimant_id: filter.claimantId,
      'resource.owner_id': filter.resourceOwnerId,
    });
  }

  const { data, error } = (await query) as {
    data: ResourceClaimRowJoinResource[] | null;
    error: Error | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to fetch resource claims', {
      error,
      filter,
    });
    throw new Error(error.message || 'Failed to fetch resource claims');
  }

  if (!data) {
    logger.debug('🏘️ API: No claims found', {
      filter,
    });
    return [];
  }

  // Transform the joined results to ResourceClaim objects with relations
  const claims = data.map(toDomainResourceClaim);

  logger.debug('🏘️ API: Successfully fetched resource claims', {
    filter,
    count: claims.length,
  });

  return claims;
}
