import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { Event, EventData } from '@belongnetwork/types';

export function useCreateEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const eventService = createEventService(supabase);

  return useMutation<Event, Error, EventData>({
    mutationFn: (data) => eventService.createEvent(data),
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