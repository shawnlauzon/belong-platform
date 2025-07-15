import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim, ResourceClaimInput } from '../types';
import { toResourceClaimInsertRow, toDomainResourceClaim } from '../transformers';
import { ResourceClaimRow } from '../types/resourceRow';

export async function createResourceClaim(
  supabase: SupabaseClient<Database>,
  claimInput: ResourceClaimInput,
): Promise<ResourceClaim> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to create resource claim', {
      authError,
      claimInput,
    });
    throw new Error('Authentication required');
  }

  // Transform to database format
  const insertData = toResourceClaimInsertRow(claimInput);

  const { data, error } = (await supabase
    .from('resource_claims')
    .insert(insertData)
    .select()
    .single()) as { data: ResourceClaimRow | null; error: QueryError | null };

  if (error) {
    logger.error('🏘️ API: Failed to create resource claim', {
      error,
      claimInput,
    });
    
    // Handle duplicate claim constraint violation
    if (error.code === '23505' && error.message.includes('resource_claims_unique_non_timeslot')) {
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

  const claim = toDomainResourceClaim(data);

  logger.debug('🏘️ API: Successfully created resource claim', {
    claimId: claim.id,
    resourceId: claim.resourceId,
    userId: claim.userId,
  });

  return claim;
}