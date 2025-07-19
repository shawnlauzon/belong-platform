import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import {
  toResourceClaimInsertRow,
  toDomainResourceClaim,
} from '../transformers';
import {
  ResourceClaimRowWithRelations,
  SELECT_RESOURCE_CLAIMS_WITH_RELATIONS,
} from '../types/resourceRow';

export async function createResourceClaim(
  supabase: SupabaseClient<Database>,
  claimInput: ResourceClaimInput,
): Promise<ResourceClaim> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  if (
    claimInput.status !== undefined &&
    claimInput.status !== 'pending' &&
    claimInput.status !== 'interested'
  ) {
    throw new Error(
      'If specified, claim status must be "pending" or "interested"',
    );
  }

  // Transform to database format
  const insertData = toResourceClaimInsertRow({
    ...claimInput,
    userId: currentUserId,
  });

  const { data, error } = (await supabase
    .from('resource_claims')
    .insert(insertData)
    .select(SELECT_RESOURCE_CLAIMS_WITH_RELATIONS)
    .single()) as {
    data: ResourceClaimRowWithRelations | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to create resource claim', {
      error,
      claimInput,
    });

    // Handle duplicate claim constraint violation
    if (
      error.code === '23505' &&
      error.message.includes('resource_claims_unique_non_timeslot')
    ) {
      throw new Error('You have already claimed this resource');
    }

    throw new Error(error.message || 'Failed to create resource claim');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from claim creation', {
      claimInput,
    });
    throw new Error('No data returned from claim creation');
  }

  // // Fetch the created claim with relations
  // const { data: claimWithRelations, error: fetchError } = (await supabase
  //   .from('resource_claims')
  //   .select(SELECT_RESOURCE_CLAIMS_WITH_RELATIONS)
  //   .eq('id', data.id)
  //   .single()) as {
  //   data: ResourceClaimRowWithRelations | null;
  //   error: QueryError | null;
  // };

  // if (fetchError || !claimWithRelations) {
  //   logger.error('🏘️ API: Failed to fetch created claim with relations', {
  //     error: fetchError,
  //     claimId: data.id,
  //   });
  //   throw new Error('Failed to fetch created claim');
  // }

  const claim = toDomainResourceClaim(data);

  logger.debug('🏘️ API: Successfully created resource claim', {
    claimId: claim.id,
    resourceId: claim.resourceId,
    userId: claim.userId,
  });

  return claim;
}
