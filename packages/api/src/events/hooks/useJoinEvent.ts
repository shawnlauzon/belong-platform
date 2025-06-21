import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { EventAttendance, EventAttendanceStatus } from '@belongnetwork/types';

export function useJoinEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const eventService = createEventService(supabase);

  return useMutation<EventAttendance, Error, { eventId: string; status?: EventAttendanceStatus }>({
    mutationFn: ({ eventId, status = 'attending' as EventAttendanceStatus }) => 
      eventService.joinEvent(eventId, status),
    onSuccess: (attendance) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', attendance.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', attendance.eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-events', attendance.userId] });

      logger.info('🎉 useJoinEvent: Successfully joined event', {
        eventId: attendance.eventId,
        userId: attendance.userId,
        status: attendance.status,
      });
    },
    onError: (error) => {
      logger.error('🎉 useJoinEvent: Failed to join event', {
        error,
      });
    },
  });
}