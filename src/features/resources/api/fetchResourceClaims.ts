import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceClaim } from '../types';
import { toDomainResourceClaim } from '../transformers';
import { ResourceClaimFilter } from '../types';
import {
  ResourceClaimRowWithRelations,
  SELECT_RESOURCE_CLAIMS_WITH_RELATIONS,
} from '../types/resourceRow';

export async function fetchResourceClaims(
  supabase: SupabaseClient<Database>,
  filter: ResourceClaimFilter = {},
): Promise<ResourceClaim[]> {
  await getAuthIdOrThrow(supabase);

  // Always use the query with relations to get complete ResourceClaim objects
  let query = supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_WITH_RELATIONS);

  // Apply resource owner filter if needed
  if (filter.resourceOwnerId) {
    query = query.eq('resources.owner_id', filter.resourceOwnerId);
  }

  // Apply filters
  if (filter.resourceId) {
    query = query.eq('resource_id', filter.resourceId);
  }

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      // Multiple statuses - use OR logic with .in()
      query = query.in('status', filter.status);
    } else {
      // Single status - use equality
      query = query.eq('status', filter.status);
    }
  }

  if (filter.timeslotId) {
    query = query.eq('timeslot_id', filter.timeslotId);
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  const { data, error } = (await query) as {
    data: ResourceClaimRowWithRelations[] | null;
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
  const claims = (data as ResourceClaimRowWithRelations[]).map(
    toDomainResourceClaim,
  );

  logger.debug('🏘️ API: Successfully fetched resource claims', {
    filter,
    count: claims.length,
  });

  return claims;
}
