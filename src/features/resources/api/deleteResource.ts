import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { Resource } from '../types';
import { ResourceRow } from '../types/resourceRow';
import { toDomainResource } from '../transformers';

export async function deleteResource(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Resource | null> {
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

  return data ? toDomainResource(data) : null;
}
