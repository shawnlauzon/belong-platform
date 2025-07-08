import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';

export async function deleteEvent(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const authId = await getAuthIdOrThrow(supabase);

  // First verify the community exists and user has permission
  const { data: existingEvent, error: fetchError } = await supabase
    .from('events')
    .select('id, organizer_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    logger.error('🏘️ API: Failed to fetch event for deletion', {
      error: fetchError,
      id,
    });
    throw fetchError;
  }

  if (!existingEvent) {
    const error = new Error('Event not found');
    logger.error('🏘️ API: Event not found', { id });
    throw error;
  }

  if (existingEvent.organizer_id !== authId) {
    const error = new Error(
      'You do not have permission to delete this community',
    );
    logger.error('🏘️ API: Permission denied - user is not organizer', {
      id,
      authId,
      organizerId: existingEvent.organizer_id,
    });
    throw error;
  }

  const { error } = (await supabase.from('events').delete().eq('id', id)) as {
    error: QueryError | null;
  };

  if (error) {
    throw new Error(error.message || 'Failed to delete event');
  }
}
