import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { fetchResourceById } from './fetchResourceById';

/**
 * Finalizes a voting event by selecting a winning timeslot.
 * This function:
 * 1. Verifies the current user is the resource owner
 * 2. Changes resource status from 'voting' to 'scheduled'
 * 3. Changes chosen timeslot status from 'proposed' to 'active'
 * 4. Cancels all other proposed timeslots
 * 5. Converts vote claims to attendance (pending/going based on requiresApproval)
 *
 * @param supabase - Supabase client
 * @param resourceId - ID of the voting event
 * @param chosenTimeslotId - ID of the timeslot to activate
 */
export async function finalizeVotedTimeslot(
  supabase: SupabaseClient<Database>,
  resourceId: string,
  chosenTimeslotId: string,
): Promise<void> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify ownership and status
  const resource = await fetchResourceById(supabase, resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  if (resource.ownerId !== user.id) {
    throw new Error('Only the resource owner can finalize voting');
  }

  if (resource.status !== 'voting') {
    throw new Error('Resource must be in voting status to finalize');
  }

  // Verify chosen timeslot exists and is proposed
  const { data: timeslot, error: timeslotError } = await supabase
    .from('resource_timeslots')
    .select('status')
    .eq('id', chosenTimeslotId)
    .single();

  if (timeslotError || !timeslot) {
    logger.error('🏘️ API: Failed to fetch chosen timeslot', {
      error: timeslotError,
      timeslotId: chosenTimeslotId,
    });
    throw new Error('Chosen timeslot not found');
  }

  if (timeslot.status !== 'proposed') {
    throw new Error('Can only finalize proposed timeslots');
  }

  // Execute finalization via database function
  const { error } = await supabase.rpc('finalize_voted_timeslot', {
    p_resource_id: resourceId,
    p_chosen_timeslot_id: chosenTimeslotId,
    p_requires_approval: resource.requiresApproval,
  });

  if (error) {
    logger.error('🏘️ API: Failed to finalize voted timeslot', {
      error,
      resourceId,
      chosenTimeslotId,
    });
    throw new Error(error.message || 'Failed to finalize voting');
  }

  logger.debug('🏘️ API: Successfully finalized voted timeslot', {
    resourceId,
    chosenTimeslotId,
  });
}
