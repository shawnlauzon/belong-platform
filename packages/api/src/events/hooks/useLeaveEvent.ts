import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';

export function useLeaveEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const eventService = createEventService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (eventId) => eventService.leaveEvent(eventId),
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