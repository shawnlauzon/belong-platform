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
  id: string,
  timeslotInput: Partial<ResourceTimeslotInput>,
): Promise<ResourceTimeslot> {
  // Check authentication first
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.error(
      '🏘️ API: Authentication required to update resource timeslot',
      {
        authError,
        id,
      },
    );
    throw new Error('Authentication required');
  }

  // Validate input if provided
  if (
    timeslotInput.startTime &&
    timeslotInput.endTime &&
    timeslotInput.startTime >= timeslotInput.endTime
  ) {
    logger.error('🏘️ API: Start time must be before end time', {
      timeslotInput,
      id,
    });
    throw new Error('Start time must be before end time');
  }

  if (timeslotInput.maxClaims !== undefined && timeslotInput.maxClaims <= 0) {
    logger.error('🏘️ API: Max claims must be positive', {
      timeslotInput,
      id,
    });
    throw new Error('Max claims must be positive');
  }

  // Transform to database format
  const updateData = forDbTimeslotUpdate(timeslotInput);

  const { data, error } = (await supabase
    .from('resource_timeslots')
    .update(updateData)
    .eq('id', id)
    .select(SELECT_RESOURCE_TIMESLOT_BASIC)
    .single()) as {
    data: ResourceTimeslotRow | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to update resource timeslot', {
      error,
      id,
      timeslotInput,
    });
    throw new Error(error.message || 'Failed to update resource timeslot');
  }

  if (!data) {
    logger.error('🏘️ API: No data returned from timeslot update', {
      id,
      timeslotInput,
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
