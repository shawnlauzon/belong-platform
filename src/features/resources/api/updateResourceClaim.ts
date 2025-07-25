import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import { forDbClaimUpdate, toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRowJoinResourceJoinTimeslot,
  SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT,
} from '../types/resourceRow';

export async function updateResourceClaim(
  supabase: SupabaseClient<Database>,
  claimInput: Partial<ResourceClaimInput> & { id: string },
): Promise<ResourceClaim> {
  // Transform to database format
  const updateData = forDbClaimUpdate(claimInput);

  const { data, error } = (await supabase
    .from('resource_claims')
    .update(updateData)
    .eq('id', claimInput.id)
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT)
    .maybeSingle()) as {
    data: ResourceClaimRowJoinResourceJoinTimeslot | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to update resource claim', {
      error,
      claimInput,
    });
    throw new Error(error.message || 'Failed to update resource claim');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from claim update', {
      claimInput,
    });
    throw new Error('Claim not found');
  }

  const claim = toDomainResourceClaim(data);

  logger.debug('🏘️ API: Successfully updated resource claim', {
    claimId: claim.id,
    resourceId: claim.resourceId,
    status: claim.status,
  });

  return claim;
}
