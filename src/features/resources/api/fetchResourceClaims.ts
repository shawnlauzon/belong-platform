import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimStatus } from '../types';
import { toDomainResourceClaim } from '../transformers';
import { ResourceClaimRow } from '../types/resourceRow';

export interface ResourceClaimFilter {
  resourceId?: string;
  userId?: string;
  status?: ResourceClaimStatus;
  timeslotId?: string;
}

export async function fetchResourceClaims(
  supabase: SupabaseClient<Database>,
  filter: ResourceClaimFilter = {},
): Promise<ResourceClaim[]> {
  let query = supabase.from('resource_claims').select('*');

  // Apply filters
  if (filter.resourceId) {
    query = query.eq('resource_id', filter.resourceId);
  }

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }

  if (filter.status) {
    query = query.eq('status', filter.status);
  }

  if (filter.timeslotId) {
    query = query.eq('timeslot_id', filter.timeslotId);
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  const { data, error } = (await query) as {
    data: ResourceClaimRow[] | null;
    error: QueryError | null;
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

  const claims = data.map(toDomainResourceClaim);

  logger.debug('🏘️ API: Successfully fetched resource claims', {
    filter,
    count: claims.length,
  });

  return claims;
}
