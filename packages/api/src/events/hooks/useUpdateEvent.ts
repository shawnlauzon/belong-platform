import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Event, EventData } from '@belongnetwork/types';
import { updateEvent } from '../impl/updateEvent';

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation<Event, Error, Partial<EventData> & { id: string }>({
    mutationFn: (data) => updateEvent(data.id, data),
    onSuccess: (updatedEvent) => {
      // Invalidate the events list to reflect the updated event
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Update the cache for this specific event
      queryClient.setQueryData(['events', updatedEvent.id], updatedEvent);

      logger.info('🎉 useUpdateEvent: Successfully updated event', {
        id: updatedEvent.id,
        title: updatedEvent.title,
      });
    },
    onError: (error) => {
      logger.error('🎉 useUpdateEvent: Failed to update event', {
        error,
      });
    },
  });
}