import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceClaim } from '@/features/resources';
import { toDomainResourceClaim } from '../transformers/resourceClaimTransformer';
import {
  ResourceClaimRowWithRelations,
  SELECT_RESOURCE_CLAIMS_WITH_RELATIONS,
} from '../types/resourceRow';

export async function fetchResourceClaimById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceClaim | null> {
  const { data, error } = (await supabase
    .from('resource_claims')
    .select(SELECT_RESOURCE_CLAIMS_WITH_RELATIONS)
    .eq('id', id)
    .single()) as {
    data: ResourceClaimRowWithRelations | null;
    error: Error | null;
  };

  if (error || !data) {
    return null;
  }

  return toDomainResourceClaim(data);
}
