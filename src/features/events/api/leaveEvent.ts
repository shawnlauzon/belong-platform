import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventAttendanceInfo, EventAttendanceData } from '../types';
import {
  forDbInsertAttendance,
  toDomainEventAttendance,
} from '../transformers/eventTransformer';
import { EventAttendanceRow } from '../types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function leaveEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<EventAttendanceInfo | null> {
  logger.debug('📅 API: Leaving event', { eventId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const attendanceData: EventAttendanceData = {
      eventId,
      userId: currentUserId,
      status: 'not_attending',
    };

    const dbData = forDbInsertAttendance(attendanceData);

    const { data, error } = (await supabase
      .from('event_attendances')
      .upsert(dbData, { onConflict: 'event_id,user_id' })
      .select()
      .single()) as { data: EventAttendanceRow; error: QueryError | null };

    if (error) {
      logger.error('📅 API: Failed to leave event', {
        error,
        eventId,
      });
      throw error;
    }

    if (!data) {
      logger.error('📅 API: No data returned after leaving event');
      return null;
    }

    const attendance = toDomainEventAttendance(data);

    logger.debug('📅 API: Successfully left event', {
      eventId,
      userId: currentUserId,
      status: 'not_attending',
    });

    return attendance;
  } catch (error) {
    logger.error('📅 API: Error leaving event', {
      error,
      eventId,
    });
    throw error;
  }
}