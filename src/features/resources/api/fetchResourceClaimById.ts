import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceClaim } from '@/features/resources';
import { toDomainResourceClaim } from '../transformers/resourceClaimTransformer';

export async function fetchResourceClaimById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceClaim | null> {
  const { data, error } = await supabase
    .from('resource_claims')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return toDomainResourceClaim(data);
}
