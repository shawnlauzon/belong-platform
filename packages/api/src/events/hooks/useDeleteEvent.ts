import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { deleteEvent } from '../impl/deleteEvent';

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteEvent,
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