import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { Event, EventData } from '@belongnetwork/types';

export function useUpdateEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const eventService = createEventService(supabase);

  return useMutation<Event, Error, Partial<EventData> & { id: string }>({
    mutationFn: ({ id, ...data }) => eventService.updateEvent(id, data),
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