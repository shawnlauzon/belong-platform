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

    // Check max attendees validation only for 'attending' status
    if (status === 'attending') {
      // Get event details to check max attendees
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('max_attendees')
        .eq('id', eventId)
        .single();

      if (eventError) {
        logger.error('📅 API: Failed to fetch event details for capacity check', {
          error: eventError,
          eventId,
        });
        throw eventError;
      }

      if (!eventData) {
        throw new Error('Event not found');
      }

      // Only check capacity if event has max attendees limit
      if (eventData.max_attendees !== null) {
        // Count current attendees with 'attending' status
        const { count: attendeeCount, error: countError } = await supabase
          .from('event_attendances')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'attending');

        if (countError) {
          logger.error('📅 API: Failed to count attendees for capacity check', {
            error: countError,
            eventId,
          });
          throw countError;
        }

        const currentAttendingCount = attendeeCount || 0;

        // Check if adding this attendee would exceed max capacity
        if (currentAttendingCount >= eventData.max_attendees) {
          logger.warn('📅 API: Event at max capacity', {
            eventId,
            currentAttendingCount,
            maxAttendees: eventData.max_attendees,
          });
          throw new Error('Event has reached maximum capacity');
        }
      }
    }

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