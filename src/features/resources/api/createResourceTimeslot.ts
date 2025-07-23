import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';
import { ResourceTimeslotInput, ResourceTimeslot } from '../types';
import {
  toResourceTimeslotInsertRow,
  toDomainResourceTimeslot,
} from '../transformers';
import {
  ResourceTimeslotRowBasic,
  SELECT_RESOURCE_TIMESLOT_BASIC,
} from '../types/resourceRow';

export async function createResourceTimeslot(
  supabase: SupabaseClient<Database>,
  timeslotInput: ResourceTimeslotInput,
): Promise<ResourceTimeslot> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  // Verify resource exists and check access
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

  // Check if user is resource owner
  const isOwner = resource.owner_id === currentUserId;

  // Check if user is a member of a community that contains this resource
  const { data: communityMembership } = await supabase
    .from('resource_communities')
    .select(`
      community_id,
      community_memberships!inner(user_id)
    `)
    .eq('resource_id', timeslotInput.resourceId)
    .eq('community_memberships.user_id', currentUserId)
    .limit(1)
    .single();

  const isCommunityMember = !!communityMembership;

  if (!isOwner && !isCommunityMember) {
    logger.error('🏘️ API: User cannot create timeslots for this resource', {
      userId: currentUserId,
      resourceId: timeslotInput.resourceId,
      resourceOwnerId: resource.owner_id,
      isOwner,
      isCommunityMember,
    });
    throw new Error('You must be the resource owner or a member of a community containing this resource to create timeslots');
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
    .select(SELECT_RESOURCE_TIMESLOT_BASIC)
    .single()) as {
    data: ResourceTimeslotRowBasic | null;
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
