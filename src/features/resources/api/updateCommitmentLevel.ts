import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, CommitmentLevel } from '../types';
import { toDomainResourceClaim } from '../transformers';
import {
  ResourceClaimRowJoinResourceJoinTimeslot,
  SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT,
} from '../types/resourceRow';

export async function updateCommitmentLevel(
  supabase: SupabaseClient<Database>,
  claimId: string,
  commitmentLevel: CommitmentLevel,
): Promise<ResourceClaim> {
  const { data, error } = (await supabase
    .from('resource_claims')
    .update({ commitment_level: commitmentLevel })
    .eq('id', claimId)
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT)
    .single()) as {
    data: ResourceClaimRowJoinResourceJoinTimeslot;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to update commitment level', {
      error,
      claimId,
      commitmentLevel,
    });

    throw new Error(error.message || 'Failed to update commitment level');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from commitment level update', {
      claimId,
      commitmentLevel,
    });
    throw new Error('No data returned from commitment level update');
  }

  const claim = toDomainResourceClaim(data);

  logger.debug('🏘️ API: Successfully updated commitment level', {
    claimId: claim.id,
    commitmentLevel: claim.commitmentLevel,
  });

  return claim;
}