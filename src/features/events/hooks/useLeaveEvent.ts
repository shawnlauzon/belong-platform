import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';

/**
 * Hook for leaving an event.
 *
 * Provides mutation functionality for leaving community events with proper cache invalidation.
 * Must be used within a BelongProvider context.
 *
 * @returns A function to leave an event
 * @category React Hooks
 */
export function useLeaveEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const mutation = useMutation({
    mutationFn: (eventId: string) => eventService.leaveEvent(eventId),
    onSuccess: (_, eventId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byId(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: ['user-attendances'],
      });

      logger.info('🎉 API: Successfully left event', {
        eventId,
      });
    },
    onError: (error) => {
      logger.error('🎉 API: Failed to leave event', {
        error,
      });
    },
  });

  return useCallback(
    (eventId: string) => {
      return mutation.mutateAsync(eventId);
    },
    [mutation.mutateAsync]
  );
}