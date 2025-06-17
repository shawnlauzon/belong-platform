import { getBelongClient } from '@belongnetwork/core';
import type { EventAttendance, EventAttendanceFilter } from '@belongnetwork/types';
import { toDomainEventAttendance } from './eventAttendanceTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchEventById } from './fetchEvents';

export async function fetchEventAttendees(
  filters: EventAttendanceFilter
): Promise<EventAttendance[]> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🎉 API: Fetching event attendees', { filters });

  try {
    let query = supabase
      .from('event_attendances')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.eventId) {
      query = query.eq('event_id', filters.eventId);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🎉 API: Failed to fetch event attendees', { error });
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get unique user and event IDs
    const userIds = Array.from(new Set(data.map(a => a.user_id)));
    const eventIds = Array.from(new Set(data.map(a => a.event_id)));

    // Fetch all required users and events
    const [users, events] = await Promise.all([
      Promise.all(userIds.map(id => fetchUserById(id))),
      Promise.all(eventIds.map(id => fetchEventById(id)))
    ]);

    // Create lookup maps
    const userMap = new Map(users.filter(Boolean).map(user => [user!.id, user!]));
    const eventMap = new Map(events.filter(Boolean).map(event => [event!.id, event!]));

    const attendances = data
      .map((dbAttendance) => {
        try {
          const user = userMap.get(dbAttendance.user_id);
          const event = eventMap.get(dbAttendance.event_id);
          
          if (!user || !event) {
            logger.warn('🎉 API: Missing user or event for attendance', {
              attendanceId: dbAttendance.id,
              userId: dbAttendance.user_id,
              eventId: dbAttendance.event_id,
              hasUser: !!user,
              hasEvent: !!event,
            });
            return null;
          }

          return toDomainEventAttendance(dbAttendance, { user, event });
        } catch (error) {
          logger.error('🎉 API: Error transforming attendance', {
            attendanceId: dbAttendance.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((attendance): attendance is EventAttendance => attendance !== null);

    logger.debug('🎉 API: Successfully fetched event attendees', {
      count: attendances.length,
    });
    return attendances;
  } catch (error) {
    logger.error('🎉 API: Error fetching event attendees', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function fetchUserEventAttendances(userId: string): Promise<EventAttendance[]> {
  return fetchEventAttendees({ userId });
}