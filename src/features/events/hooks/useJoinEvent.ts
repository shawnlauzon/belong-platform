import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';
import type { EventAttendanceStatus } from '../types';

/**
 * Hook for joining an event.
 *
 * Provides mutation functionality for joining community events with proper cache invalidation.
 * Must be used within a BelongProvider context.
 *
 * @returns A function to join an event
 * @category React Hooks
 */
export function useJoinEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const mutation = useMutation({
    mutationFn: ({
      eventId,
      status = 'attending' as EventAttendanceStatus,
    }: {
      eventId: string;
      status?: EventAttendanceStatus;
    }) => eventService.joinEvent(eventId, status),
    onSuccess: (attendance) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byId(attendance.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(attendance.event.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.userAttendances(attendance.user.id),
      });

      logger.info('🎉 API: Successfully joined event', {
        eventId: attendance.event.id,
        userId: attendance.user.id,
        status: attendance.status,
      });
    },
    onError: (error) => {
      logger.error('🎉 API: Failed to join event', {
        error,
      });
    },
  });

  return useCallback(
    (eventId: string, status?: EventAttendanceStatus) => {
      return mutation.mutateAsync({ eventId, status });
    },
    [mutation.mutateAsync]
  );
}