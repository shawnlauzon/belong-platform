import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import { forDbTimeslotUpdate, toDomainResourceTimeslot } from '../transformers';
import {
  ResourceTimeslotRow,
  SELECT_RESOURCE_TIMESLOT_BASIC,
} from '../types/resourceRow';

export async function updateResourceTimeslot(
  supabase: SupabaseClient<Database>,
  update: Partial<ResourceTimeslotInput> & { id: string },
): Promise<ResourceTimeslot> {
  // Transform to database format
  const updateData = forDbTimeslotUpdate(update);

  const { data, error } = (await supabase
    .from('resource_timeslots')
    .update(updateData)
    .eq('id', update.id)
    .select(SELECT_RESOURCE_TIMESLOT_BASIC)
    .maybeSingle()) as {
    data: ResourceTimeslotRow | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to update resource timeslot', {
      error,
      update,
    });
    throw new Error(error.message || 'Failed to update resource timeslot');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from timeslot update', {
      update,
    });
    throw new Error('No data returned from timeslot update');
  }

  const timeslot = toDomainResourceTimeslot(data);

  logger.debug('🏘️ API: Successfully updated resource timeslot', {
    timeslotId: timeslot.id,
    resourceId: timeslot.resourceId,
  });

  return timeslot;
}
