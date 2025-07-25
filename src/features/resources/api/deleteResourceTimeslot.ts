import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceTimeslot } from '../types';
import { ResourceTimeslotRow } from '../types/resourceRow';
import { toDomainResourceTimeslot } from '../transformers';

export async function deleteResourceTimeslot(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceTimeslot | null> {
  const { data, error } = (await supabase
    .from('resource_timeslots')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle()) as {
    data: ResourceTimeslotRow | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource timeslot', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource timeslot');
  }

  logger.debug('🏘️ API: Successfully deleted resource timeslot', {
    id,
  });

  return data ? toDomainResourceTimeslot(data) : null;
}
