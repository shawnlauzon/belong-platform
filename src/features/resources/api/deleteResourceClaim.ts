import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim } from '../types';
import { ResourceClaimRowJoinResourceJoinTimeslot } from '../types/resourceRow';
import { toDomainResourceClaim } from '../transformers';

const SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT = `
  *,
  resources!inner(owner_id),
  resource_timeslots!inner(*)
`;

export async function deleteResourceClaim(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceClaim | null> {
  const { data, error } = (await supabase
    .from('resource_claims')
    .delete()
    .eq('id', id)
    .select(SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT)
    .maybeSingle()) as {
    data: ResourceClaimRowJoinResourceJoinTimeslot | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource claim', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource claim');
  }

  logger.debug('🏘️ API: Successfully deleted resource claim', {
    id,
  });

  return data ? toDomainResourceClaim(data) : null;
}
