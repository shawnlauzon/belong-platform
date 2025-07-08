import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function leaveEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<void> {
  logger.debug('📅 API: Leaving event', { eventId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const { error } = (await supabase
      .from('event_attendances')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', currentUserId)) as { error: QueryError | null };

    if (error) {
      logger.error('📅 API: Failed to leave event', {
        error,
        eventId,
      });
      throw error;
    }

    logger.debug('📅 API: Successfully left event', {
      eventId,
      userId: currentUserId,
    });

    // Note: Attendee count is maintained by database triggers or manual updates
    // For now we skip automatic count updates to keep the implementation simple
  } catch (error) {
    logger.error('📅 API: Error leaving event', {
      error,
      eventId,
    });
    throw error;
  }
}