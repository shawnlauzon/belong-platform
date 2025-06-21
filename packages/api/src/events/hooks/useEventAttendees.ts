import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { EventAttendance, EventAttendanceFilter } from '@belongnetwork/types';

export function useEventAttendees(eventId: string, filters?: Omit<EventAttendanceFilter, 'eventId'>) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  const result = useQuery<EventAttendance[], Error>({
    queryKey: ['event-attendees', eventId, filters],
    queryFn: () => eventService.fetchEventAttendees({ ...filters, eventId }),
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