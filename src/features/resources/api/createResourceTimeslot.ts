import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger, getAuthIdOrThrow } from '@/shared';
import { ResourceTimeslotInput, ResourceTimeslot } from '../types';
import {
  toResourceTimeslotInsertRow,
  toDomainResourceTimeslot,
} from '../transformers';
import {
  ResourceTimeslotRow,
  SELECT_RESOURCE_TIMESLOT_BASIC,
} from '../types/resourceRow';
import { fetchResourceById } from './fetchResourceById';

export async function createResourceTimeslot(
  supabase: SupabaseClient<Database>,
  timeslotInput: ResourceTimeslotInput,
): Promise<ResourceTimeslot> {
  // Validation for proposed timeslots
  if (timeslotInput.status === 'proposed') {
    const resource = await fetchResourceById(supabase, timeslotInput.resourceId);

    if (!resource) {
      throw new Error('Resource not found');
    }

    // Allow proposed timeslots for voting or active resources
    const allowedStatuses = ['voting', 'active'];
    if (!allowedStatuses.includes(resource.status)) {
      throw new Error('Proposed timeslots only allowed for voting or active resources');
    }

    // Check timeslotsFlexible flag
    if (!resource.areTimeslotsFlexible) {
      const userId = await getAuthIdOrThrow(supabase, 'create resource timeslot');
      if (userId !== resource.ownerId) {
        throw new Error(
          'Only the resource owner can propose timeslots when timeslots are not flexible',
        );
      }
    }

    // Validate durationMinutes constraint
    if (resource.durationMinutes) {
      const expectedEndTime = new Date(
        timeslotInput.startTime.getTime() + resource.durationMinutes * 60000,
      );

      if (timeslotInput.endTime.getTime() !== expectedEndTime.getTime()) {
        throw new Error(
          `End time must be ${resource.durationMinutes} minutes after start time`,
        );
      }
    }
  }

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
