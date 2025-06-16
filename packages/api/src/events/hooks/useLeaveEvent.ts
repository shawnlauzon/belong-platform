import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { leaveEvent } from '../impl/leaveEvent';

export function useLeaveEvent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: leaveEvent,
    onSuccess: (_, eventId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });

      logger.info('🎉 useLeaveEvent: Successfully left event', {
        eventId,
      });
    },
    onError: (error) => {
      logger.error('🎉 useLeaveEvent: Failed to leave event', {
        error,
      });
    },
  });
}