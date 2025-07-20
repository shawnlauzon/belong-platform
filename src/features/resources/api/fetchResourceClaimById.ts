import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceClaim } from '@/features/resources';
import { toDomainResourceClaim } from '../transformers/resourceClaimTransformer';
import {
  ResourceClaimRowBasic,
  SELECT_RESOURCE_CLAIMS_BASIC,
} from '../types/resourceRow';

export async function fetchResourceClaimById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceClaim | null> {
  const { data, error } = (await supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_BASIC)
    .eq('id', id)
    .single()) as {
    data: ResourceClaimRowBasic | null;
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toDomainResourceClaim(data);
}
