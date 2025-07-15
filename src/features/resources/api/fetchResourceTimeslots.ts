import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceTimeslot } from '../types';
import { toDomainResourceTimeslot } from '../transformers';
import { ResourceTimeslotRow } from '../types/resourceRow';

export async function fetchResourceTimeslots(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<ResourceTimeslot[]> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to fetch resource timeslots', {
      authError,
      resourceId,
    });
    throw new Error('Authentication required');
  }

  const { data, error } = (await supabase
    .from('resource_timeslots')
    .select('*')
    .eq('resource_id', resourceId)
    .order('start_time', { ascending: true })) as { data: ResourceTimeslotRow[] | null; error: QueryError | null };

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