import { getBelongClient } from '@belongnetwork/core';
import type { EventAttendance, EventAttendanceStatus } from '@belongnetwork/types';
import { toDomainEventAttendance, forDbInsert } from './eventAttendanceTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchEventById } from './fetchEvents';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function joinEvent(
  eventId: string,
  status: EventAttendanceStatus = 'attending' as EventAttendanceStatus
): Promise<EventAttendance> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🎉 API: Joining event', { eventId, status });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🎉 API: User must be authenticated to join an event', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Check if event exists and get its details
    const event = await fetchEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check capacity if maxAttendees is set
    if (event.maxAttendees && status === 'attending') {
      const { data: currentAttendees, error: countError } = await supabase
        .from('event_attendances')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('status', 'attending');

      if (countError) {
        logger.error('🎉 API: Failed to check event capacity', { eventId, error: countError });
        throw countError;
      }

      if (currentAttendees && currentAttendees.length >= event.maxAttendees) {
        throw new Error('Event is at capacity');
      }
    }

    // Transform to database format
    const dbAttendance = forDbInsert(
      { eventId, userId, status },
      userId
    );

    // Insert or update attendance record
    const { data: attendanceRecord, error } = await supabase
      .from('event_attendances')
      .upsert([dbAttendance], { 
        onConflict: 'event_id,user_id',
        ignoreDuplicates: false 
      })
      .select('*')
      .single();

    if (error) {
      logger.error('🎉 API: Failed to join event', { eventId, error });
      throw error;
    }

    // Fetch user and event for transformation
    const [user] = await Promise.all([
      fetchUserById(userId)
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Transform to domain model
    const attendance = toDomainEventAttendance(attendanceRecord, { user, event });

    logger.info('🎉 API: Successfully joined event', {
      eventId,
      userId,
      status,
    });

    return attendance;
  } catch (error) {
    logger.error('🎉 API: Error joining event', { eventId, error });
    throw error;
  }
}