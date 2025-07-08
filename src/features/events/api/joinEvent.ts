import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventAttendance, EventAttendanceData } from '@/features/events';
import { forDbInsertAttendance, toDomainEventAttendance } from '@/features/events/transformers/eventTransformer';
import { EventAttendanceRow } from '../types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function joinEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  status: 'attending' | 'maybe' = 'attending',
): Promise<EventAttendance | null> {
  logger.debug('📅 API: Joining event', { eventId, status });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const attendanceData: EventAttendanceData = {
      eventId,
      userId: currentUserId,
      status,
    };

    const dbData = forDbInsertAttendance(attendanceData);

    // Use upsert to handle cases where user already has a record
    const { data, error } = (await supabase
      .from('event_attendances')
      .upsert(dbData, { onConflict: 'event_id,user_id' })
      .select()
      .single()) as { data: EventAttendanceRow; error: QueryError | null };

    if (error) {
      logger.error('📅 API: Failed to join event', {
        error,
        eventId,
        status,
      });
      throw error;
    }

    if (!data) {
      logger.error('📅 API: No data returned after joining event');
      return null;
    }

    const attendance = toDomainEventAttendance(data);

    logger.debug('📅 API: Successfully joined event', {
      eventId,
      userId: currentUserId,
      status,
    });

    // Note: Attendee count is maintained by database triggers or manual updates
    // For now we skip automatic count updates to keep the implementation simple

    return attendance;
  } catch (error) {
    logger.error('📅 API: Error joining event', {
      error,
      eventId,
      status,
    });
    throw error;
  }
}