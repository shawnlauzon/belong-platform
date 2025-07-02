import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';
import type { EventData } from '../types';

/**
 * Hook for updating an existing event.
 *
 * Provides mutation functionality for updating community events with proper cache invalidation.
 * Must be used within a BelongProvider context.
 *
 * @returns A function to update an event
 * @category React Hooks
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventData> }) =>
      eventService.updateEvent(id, data),
    onSuccess: (updatedEvent) => {
      // Invalidate all events queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byCommunity(updatedEvent.community.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byOrganizer(updatedEvent.organizer.id),
      });

      // Update the cache for this specific event
      queryClient.setQueryData(
        queryKeys.events.byId(updatedEvent.id),
        updatedEvent
      );

      logger.info('🎉 API: Successfully updated event', {
        id: updatedEvent.id,
        title: updatedEvent.title,
      });
    },
    onError: (error) => {
      logger.error('🎉 API: Failed to update event', {
        error,
      });
    },
  });

  return useCallback(
    (id: string, data: Partial<EventData>) => {
      return mutation.mutateAsync({ id, data });
    },
    [mutation.mutateAsync]
  );
}