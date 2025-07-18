import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import { forDbClaimUpdate, toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRow,
  ResourceClaimRowWithRelations,
  SELECT_RESOURCE_CLAIMS_WITH_RELATIONS,
} from '../types/resourceRow';

export async function updateResourceClaim(
  supabase: SupabaseClient<Database>,
  id: string,
  claimInput: Partial<ResourceClaimInput>,
): Promise<ResourceClaim> {
  // Transform to database format
  const updateData = forDbClaimUpdate(claimInput);

  const { data, error } = (await supabase
    .from('resource_claims')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()) as { data: ResourceClaimRow | null; error: QueryError | null };

  if (error) {
    logger.error('🏘️ API: Failed to update resource claim', {
      error,
      id,
      claimInput,
    });
    throw new Error(error.message || 'Failed to update resource claim');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from claim update', {
      id,
      claimInput,
    });
    throw new Error('Claim not found');
  }

  // Fetch the updated claim with relations
  const { data: claimWithRelations, error: fetchError } = (await supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_WITH_RELATIONS)
    .eq('id', data.id)
    .single()) as {
    data: ResourceClaimRowWithRelations | null;
    error: QueryError | null;
  };

  if (fetchError || !claimWithRelations) {
    logger.error('🏘️ API: Failed to fetch updated claim with relations', {
      error: fetchError,
      claimId: data.id,
    });
    throw new Error('Failed to fetch updated claim');
  }

  const claim = toDomainResourceClaim(claimWithRelations);

  logger.debug('🏘️ API: Successfully updated resource claim', {
    claimId: claim.id,
    resourceId: claim.resourceId,
    status: claim.status,
  });

  return claim;
}
