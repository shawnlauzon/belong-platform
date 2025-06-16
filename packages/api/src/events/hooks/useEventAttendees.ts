import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { EventAttendance, EventAttendanceFilter } from '@belongnetwork/types';
import { fetchEventAttendees } from '../impl/fetchEventAttendees';

export function useEventAttendees(eventId: string, filters?: Omit<EventAttendanceFilter, 'eventId'>) {
  const result = useQuery<EventAttendance[], Error>({
    queryKey: ['event-attendees', eventId, filters],
    queryFn: () => fetchEventAttendees({ ...filters, eventId }),
    enabled: !!eventId,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useEventAttendees: Error fetching event attendees', { 
      error: result.error,
      eventId,
      filters,
    });
  }

  return result;
}