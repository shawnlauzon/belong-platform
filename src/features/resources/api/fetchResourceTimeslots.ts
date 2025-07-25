import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { appendQueries, logger } from '@/shared';
import { ResourceTimeslot } from '../types';
import { toDomainResourceTimeslot } from '../transformers';
import {
  ResourceTimeslotRow,
  SELECT_RESOURCE_TIMESLOT_BASIC,
} from '../types/resourceRow';
import { ResourceTimeslotFilter } from '../types/resourceTimeslotFilter';

export async function fetchResourceTimeslots(
  supabase: SupabaseClient<Database>,
  filter?: ResourceTimeslotFilter,
): Promise<ResourceTimeslot[]> {
  let query = supabase.from('resources').select(SELECT_RESOURCE_TIMESLOT_BASIC);

  if (filter) {
    query = appendQueries(query, {
      resource_id: filter.resourceId,
    });
  }

  const { data, error } = (await query) as {
    data: ResourceTimeslotRow[] | null;
    error: Error | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to fetch resource timeslots', {
      error,
      filter,
    });
    throw new Error(error.message || 'Failed to fetch resource timeslots');
  }

  if (!data) {
    logger.debug('🏘️ API: No timeslots found for resource', {
      filter,
    });
    return [];
  }

  const timeslots = data.map(toDomainResourceTimeslot);

  logger.debug('🏘️ API: Successfully fetched resource timeslots', {
    filter,
    count: timeslots.length,
  });

  return timeslots;
}
