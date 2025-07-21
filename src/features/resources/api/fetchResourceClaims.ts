import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceClaim, ResourceClaimFilter } from '../types';
import { toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRowBasic,
  SELECT_RESOURCE_CLAIMS_BASIC,
  SELECT_RESOURCE_CLAIMS_WITH_SHOUTOUTS,
} from '../types/resourceRow';

export async function fetchResourceClaims(
  supabase: SupabaseClient<Database>,
  filter?: ResourceClaimFilter,
): Promise<ResourceClaim[]> {
  await getAuthIdOrThrow(supabase);

  // Always use the query with relations to get complete ResourceClaim objects
  let query = supabase
    .from('resource_claims')
    .select(
      filter?.hasShoutout !== undefined
        ? SELECT_RESOURCE_CLAIMS_WITH_SHOUTOUTS
        : SELECT_RESOURCE_CLAIMS_BASIC,
    );

  if (filter?.claimantId) {
    query = query.eq('user_id', filter.claimantId);
  }

  if (filter?.resourceId) {
    if (Array.isArray(filter.resourceId)) {
      query = query.in('resource_id', filter.resourceId);
    } else {
      query = query.eq('resource_id', filter.resourceId);
    }
  }

  if (filter?.resourceOwnerId) {
    query = query.eq('resources.owner_id', filter.resourceOwnerId);
  }

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      // Multiple statuses - use OR logic with .in()
      query = query.in('status', filter.status);
    } else {
      // Single status - use equality
      query = query.eq('status', filter.status);
    }
  }

  if (filter?.timeslotId) {
    query = query.eq('timeslot_id', filter.timeslotId);
  }

  if (filter?.hasShoutout !== undefined) {
    // the shoutouts relation is already included in the SELECT statement
    // FIXME I don't think this is right, it needs to do some sort of join and if it exists
    query = query.eq('shoutouts', filter.hasShoutout);
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  const { data, error } = (await query) as {
    data: ResourceClaimRowBasic[] | null;
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
  const claims = (data as ResourceClaimRowBasic[]).map(toDomainResourceClaim);

  logger.debug('🏘️ API: Successfully fetched resource claims', {
    filter,
    count: claims.length,
  });

  return claims;
}
