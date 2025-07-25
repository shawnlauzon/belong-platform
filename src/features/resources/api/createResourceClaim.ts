import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import {
  toResourceClaimInsertRow,
  toDomainResourceClaim,
} from '../transformers';
import {
  ResourceClaimRowJoinResourceJoinTimeslot,
  SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT,
} from '../types/resourceRow';

export async function createResourceClaim(
  supabase: SupabaseClient<Database>,
  claimInput: ResourceClaimInput,
): Promise<ResourceClaim> {
  // Transform to database format
  const insertData = toResourceClaimInsertRow(claimInput);

  const { data, error } = (await supabase
    .from('resource_claims')
    .insert(insertData)
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT)
    .single()) as {
    data: ResourceClaimRowJoinResourceJoinTimeslot;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to create resource claim', {
      error,
      claimInput,
    });

    // Handle duplicate claim constraint violation
    if (error.code === '23505') {
      throw new Error('You have already claimed this timeslot');
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
  //   .select(SELECT_RESOURCE_CLAIMS_BASIC)
  //   .eq('id', data.id)
  //   .single()) as {
  //   data: ResourceClaimRowBasic | null;
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
    claimantId: claim.claimantId,
  });

  return claim;
}
