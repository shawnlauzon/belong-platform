import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';
import type { EventData } from '../types';

/**
 * Hook for creating a new event.
 *
 * Provides mutation functionality for creating community events with proper cache invalidation.
 * Must be used within a BelongProvider context.
 *
 * @returns A function to create an event
 * @category React Hooks
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const mutation = useMutation({
    mutationFn: (data: EventData) => eventService.createEvent(data),
    onSuccess: (newEvent) => {
      // Invalidate all events queries to reflect the new event
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byCommunity(newEvent.community.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byOrganizer(newEvent.organizer.id),
      });

      // Update the cache for this specific event
      queryClient.setQueryData(queryKeys.events.byId(newEvent.id), newEvent);

      logger.info('🎉 API: Successfully created event', {
        id: newEvent.id,
        title: newEvent.title,
        startDateTime: newEvent.startDateTime,
      });
    },
    onError: (error) => {
      logger.error('🎉 API: Failed to create event', {
        error,
      });
    },
  });

  return useCallback(
    (data: EventData) => {
      return mutation.mutateAsync(data);
    },
    [mutation.mutateAsync]
  );
}