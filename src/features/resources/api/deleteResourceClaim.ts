import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceClaim } from '../types';
import type { QueryError } from '@supabase/supabase-js';
import { ResourceClaimRow } from '../types/resourceRow';
import { toDomainResourceClaim } from '../transformers';

export async function deleteResourceClaim(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceClaim | null> {
  const { data, error } = (await supabase
    .from('resource_claims')
    .delete()
    .eq('id', id)
    .select()) as {
    data: ResourceClaimRow | null;
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
