import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Event, EventData } from '@belongnetwork/types';
import { createEvent } from '../impl/createEvent';

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation<Event, Error, EventData>({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      // Invalidate the events list to reflect the new event
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Update the cache for this specific event
      queryClient.setQueryData(['events', newEvent.id], newEvent);

      logger.info('🎉 useCreateEvent: Successfully created event', {
        id: newEvent.id,
        title: newEvent.title,
        startDateTime: newEvent.startDateTime,
      });
    },
    onError: (error) => {
      logger.error('🎉 useCreateEvent: Failed to create event', {
        error,
      });
    },
  });
}