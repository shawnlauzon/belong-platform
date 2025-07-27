import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceRow } from '../types/resourceRow';
import { toDomainResourceSummary } from '../transformers';
import { ResourceSummary } from '../types';

export async function deleteResource(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceSummary | null> {
  const { data, error } = (await supabase
    .from('resources')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle()) as {
    data: ResourceRow | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource', {
      error,
      id,
    });
    throw error;
  }

  logger.debug('🏘️ API: Successfully deleted resource', {
    id,
  });

  return data ? toDomainResourceSummary(data) : null;
}
