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

// Helper function to check existing attendance
async function getExistingAttendance(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string,
): Promise<{ status: 'attending' | 'maybe' | 'not_attending' } | null> {
  const { data, error } = await supabase
    .from('event_attendances')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('📅 API: Failed to check existing attendance', {
      error,
      eventId,
      userId,
    });
    throw error;
  }

  return data as { status: 'attending' | 'maybe' | 'not_attending' } | null;
}

// Helper function to check event capacity using stored attendee_count
async function checkEventCapacity(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<void> {
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('max_attendees, attendee_count')
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
    const currentAttendingCount = eventData.attendee_count;

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

// Helper function to save attendance
async function saveAttendance(
  supabase: SupabaseClient<Database>,
  attendanceData: EventAttendanceData,
): Promise<EventAttendanceInfo | null> {
  const dbData = forDbInsertAttendance(attendanceData);

  const { data, error } = (await supabase
    .from('event_attendances')
    .upsert(dbData, { onConflict: 'event_id,user_id' })
    .select()
    .single()) as { data: EventAttendanceRow; error: QueryError | null };

  if (error) {
    logger.error('📅 API: Failed to save attendance', {
      error,
      attendanceData,
    });
    throw error;
  }

  if (!data) {
    logger.error('📅 API: No data returned after saving attendance');
    return null;
  }

  return toDomainEventAttendance(data);
}

export async function joinEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  status: 'attending' | 'maybe' = 'attending',
): Promise<EventAttendanceInfo | null> {
  logger.debug('📅 API: Joining event', { eventId, status });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Check if user is already joined with the same status
    const existingAttendance = await getExistingAttendance(
      supabase,
      eventId,
      currentUserId,
    );

    if (existingAttendance && existingAttendance.status === status) {
      logger.warn('📅 API: User already joined with same status', {
        eventId,
        userId: currentUserId,
        status,
      });
      throw new Error('Already joined this event with the same status');
    }

    // Check max attendees validation only for 'attending' status
    if (status === 'attending') {
      await checkEventCapacity(supabase, eventId);
    }

    const attendanceData: EventAttendanceData = {
      eventId,
      userId: currentUserId,
      status,
    };

    const attendance = await saveAttendance(supabase, attendanceData);

    logger.debug('📅 API: Successfully joined event', {
      eventId,
      userId: currentUserId,
      status,
    });

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
