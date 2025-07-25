import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceTimeslotInput, ResourceTimeslot } from '../types';
import {
  toResourceTimeslotInsertRow,
  toDomainResourceTimeslot,
} from '../transformers';
import {
  ResourceTimeslotRow,
  SELECT_RESOURCE_TIMESLOT_BASIC,
} from '../types/resourceRow';

export async function createResourceTimeslot(
  supabase: SupabaseClient<Database>,
  timeslotInput: ResourceTimeslotInput,
): Promise<ResourceTimeslot> {
  // Transform to database format
  const insertData = toResourceTimeslotInsertRow(timeslotInput);

  const { data, error } = (await supabase
    .from('resource_timeslots')
    .insert(insertData)
    .select(SELECT_RESOURCE_TIMESLOT_BASIC)
    .single()) as {
    data: ResourceTimeslotRow;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to create resource timeslot', {
      error,
      timeslotInput,
    });
    throw new Error(error.message || 'Failed to create resource timeslot');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from timeslot creation', {
      timeslotInput,
    });
    throw new Error('No data returned from timeslot creation');
  }

  const timeslot = toDomainResourceTimeslot(data);

  logger.debug('🏘️ API: Successfully created resource timeslot', {
    timeslotId: timeslot.id,
    resourceId: timeslot.resourceId,
  });

  return timeslot;
}
