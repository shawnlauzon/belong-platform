import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceTimeslotInput, ResourceTimeslot } from '../types';
import {
  toResourceTimeslotInsertRow,
  toDomainResourceTimeslot,
} from '../transformers';
import {
  ResourceTimeslotRowWithRelations,
  SELECT_RESOURCE_TIMESLOT_WITH_RELATIONS,
} from '../types/resourceRow';

export async function createResourceTimeslot(
  supabase: SupabaseClient<Database>,
  timeslotInput: ResourceTimeslotInput,
): Promise<ResourceTimeslot> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  // Verify user owns the resource
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('owner_id')
    .eq('id', timeslotInput.resourceId)
    .single();

  if (resourceError || !resource) {
    logger.error('🏘️ API: Resource not found for timeslot creation', {
      resourceError,
      resourceId: timeslotInput.resourceId,
    });
    throw new Error('Resource not found');
  }

  if (resource.owner_id !== currentUserId) {
    logger.error('🏘️ API: User does not own resource for timeslot creation', {
      userId: currentUserId,
      resourceId: timeslotInput.resourceId,
      resourceOwnerId: resource.owner_id,
    });
    throw new Error('Only resource owners can create timeslots');
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
    .select(SELECT_RESOURCE_TIMESLOT_WITH_RELATIONS)
    .single()) as {
    data: ResourceTimeslotRowWithRelations | null;
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
