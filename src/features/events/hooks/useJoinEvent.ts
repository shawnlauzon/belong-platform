import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { joinEvent } from '@/features/events/api/joinEvent';

/**
 * Hook for joining an event.
 *
 * Provides a mutation function for users to join events.
 * Automatically invalidates event caches on successful join.
 *
 * @returns React Query mutation result with join function and state
 *
 * @example
 * ```tsx
 * function JoinEventButton({ eventId }) {
 *   const joinEventMutation = useJoinEvent();
 *
 *   const handleJoin = async (status = 'attending') => {
 *     try {
 *       await joinEventMutation.mutateAsync({ eventId, status });
 *       // Successfully joined event
 *     } catch (error) {
 *       console.error('Failed to join event:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button 
 *         onClick={() => handleJoin('attending')} 
 *         disabled={joinEventMutation.isPending}
 *       >
 *         {joinEventMutation.isPending ? 'Joining...' : 'Attend'}
 *       </button>
 *       <button 
 *         onClick={() => handleJoin('maybe')} 
 *         disabled={joinEventMutation.isPending}
 *       >
 *         {joinEventMutation.isPending ? 'Joining...' : 'Maybe'}
 *       </button>
 *       {joinEventMutation.error && (
 *         <div className="error">{joinEventMutation.error.message}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJoinEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async ({
      eventId,
      status = 'attending',
    }: {
      eventId: string;
      status?: 'attending' | 'maybe';
    }) => joinEvent(supabase, eventId, status),
    onSuccess: (attendance, { eventId }) => {
      if (attendance) {
        // Invalidate event queries to refresh attendee data
        queryClient.invalidateQueries({ queryKey: queryKeys.events.byId(eventId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(eventId) });
        queryClient.invalidateQueries({ queryKey: ['events'] });

        logger.info('📅 API: Successfully joined event', {
          eventId,
          userId: attendance.userId,
          status: attendance.status,
        });
      }
    },
    onError: (error) => {
      logger.error('📅 API: Failed to join event', { error });
    },
  });
}