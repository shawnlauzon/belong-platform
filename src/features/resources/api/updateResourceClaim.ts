import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import { forDbClaimUpdate, toDomainResourceClaim } from '../transformers';
import { ResourceClaimRow } from '../types/resourceRow';

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

  const claim = toDomainResourceClaim(data);

  logger.debug('🏘️ API: Successfully updated resource claim', {
    claimId: claim.id,
    resourceId: claim.resourceId,
    status: claim.status,
  });

  return claim;
}
