import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { leaveEvent } from '@/features/events/api/leaveEvent';
import { useCurrentUser } from '@/features/auth';

/**
 * Hook for leaving an event.
 *
 * Provides a mutation function for users to leave events.
 * Automatically invalidates event caches on successful leave.
 *
 * @returns React Query mutation result with leave function and state
 *
 * @example
 * ```tsx
 * function LeaveEventButton({ eventId }) {
 *   const { mutate: leaveEvent, isLoading, error } = useLeaveEvent();
 *
 *   const handleLeave = () => {
 *     if (!confirm('Are you sure you want to leave this event?')) {
 *       return;
 *     }
 *
 *     leaveEvent(eventId, {
 *       onSuccess: () => {
 *         // User successfully left event
 *       },
 *       onError: (error) => {
 *         console.error('Failed to leave event:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleLeave} disabled={isLoading}>
 *       {isLoading ? 'Leaving...' : 'Leave Event'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLeaveEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: (eventId: string) => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to leave events');
      }
      return leaveEvent(supabase, eventId, currentUser.data.id);
    },
    onSuccess: (_, eventId) => {
      // Invalidate event queries to refresh attendee data
      queryClient.invalidateQueries({ queryKey: queryKeys.events.byId(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(eventId) });
      queryClient.invalidateQueries({ queryKey: ['events'] });

      logger.info('📅 API: Successfully left event', {
        eventId,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to leave event', { error });
    },
  });

  return mutation;
}