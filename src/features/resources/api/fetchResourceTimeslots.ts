import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceTimeslot } from '../types';
import { toDomainResourceTimeslot } from '../transformers';
import {
  ResourceTimeslotRowWithRelations,
  SELECT_RESOURCE_TIMESLOT_WITH_RELATIONS,
} from '../types/resourceRow';

export async function fetchResourceTimeslots(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<ResourceTimeslot[]> {
  await getAuthIdOrThrow(supabase);
  const { data, error } = (await supabase
    .from('resource_timeslots')
    // select timeslots joined with claims
    .select(SELECT_RESOURCE_TIMESLOT_WITH_RELATIONS)
    .eq('resource_id', resourceId)
    .order('start_time', { ascending: true })) as {
    data: ResourceTimeslotRowWithRelations[] | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to fetch resource timeslots', {
      error,
      resourceId,
    });
    throw new Error(error.message || 'Failed to fetch resource timeslots');
  }

  if (!data) {
    logger.debug('🏘️ API: No timeslots found for resource', {
      resourceId,
    });
    return [];
  }

  const timeslots = data.map(toDomainResourceTimeslot);

  logger.debug('🏘️ API: Successfully fetched resource timeslots', {
    resourceId,
    count: timeslots.length,
  });

  return timeslots;
}
