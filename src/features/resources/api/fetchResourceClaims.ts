import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { appendQueries, logger } from '@/shared';
import { ResourceClaim, ResourceClaimFilter } from '../types';
import { toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRowJoinResourceJoinTimeslot,
  SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT,
} from '../types/resourceRow';

export async function fetchResourceClaims(
  supabase: SupabaseClient<Database>,
  filter?: ResourceClaimFilter,
): Promise<ResourceClaim[]> {
  let query = supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT);

  if (filter) {
    query = appendQueries(query, {
      resource_id: filter.resourceId,
      claimant_id: filter.claimantId,
      'resources.owner_id': filter.resourceOwnerId,
    });
  }

  const { data, error } = (await query) as {
    data: ResourceClaimRowJoinResourceJoinTimeslot[] | null;
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
