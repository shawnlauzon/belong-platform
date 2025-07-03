import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';

/**
 * Hook for deleting an event.
 *
 * Provides mutation functionality for deleting community events with proper cache invalidation.
 * Must be used within a BelongProvider context.
 *
 * @returns A function to delete an event
 * @category React Hooks
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const mutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: async (_, eventId) => {
      // Remove ALL events-related cache data synchronously first
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'events' || key[0] === 'event';
        },
      });

      // Then invalidate to trigger fresh fetches for active queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'events' || key[0] === 'event';
        },
      });

      logger.info('🎉 API: Successfully deleted event', {
        id: eventId,
      });
    },
    onError: (error) => {
      logger.error('🎉 API: Failed to delete event', {
        error,
      });
    },
  });

  return useCallback(
    (id: string) => {
      return mutation.mutateAsync(id);
    },
    [mutation.mutateAsync]
  );
}
