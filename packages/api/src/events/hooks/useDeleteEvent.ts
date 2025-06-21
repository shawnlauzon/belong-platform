import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';

export function useDeleteEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const eventService = createEventService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (id) => eventService.deleteEvent(id),
    onSuccess: (_, eventId) => {
      // Invalidate the events list to reflect the deleted event
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Remove this specific event from cache
      queryClient.removeQueries({ queryKey: ['events', eventId] });

      logger.info('🎉 useDeleteEvent: Successfully deleted event', {
        id: eventId,
      });
    },
    onError: (error) => {
      logger.error('🎉 useDeleteEvent: Failed to delete event', {
        error,
      });
    },
  });
}