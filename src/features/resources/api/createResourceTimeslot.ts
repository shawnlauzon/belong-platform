import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { ResourceTimeslotInput, ResourceTimeslot } from '../types';
import { toResourceTimeslotInsertRow, toDomainResourceTimeslot } from '../transformers';
import { ResourceTimeslotRow } from '../types/resourceRow';

export async function createResourceTimeslot(
  supabase: SupabaseClient<Database>,
  timeslotInput: ResourceTimeslotInput,
): Promise<ResourceTimeslot> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to create resource timeslot', {
      authError,
      timeslotInput,
    });
    throw new Error('Authentication required');
  }

  // Validate input
  if (timeslotInput.startTime >= timeslotInput.endTime) {
    logger.error('🏘️ API: Start time must be before end time', {
      timeslotInput,
    });
    throw new Error('Start time must be before end time');
  }

  if (timeslotInput.maxClaims <= 0) {
    logger.error('🏘️ API: Max claims must be positive', {
      timeslotInput,
    });
    throw new Error('Max claims must be positive');
  }

  // Transform to database format
  const insertData = toResourceTimeslotInsertRow(timeslotInput);

  const { data, error } = (await supabase
    .from('resource_timeslots')
    .insert(insertData)
    .select()
    .single()) as { data: ResourceTimeslotRow | null; error: QueryError | null };

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