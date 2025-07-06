import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { joinEvent } from '@/features/events/api/joinEvent';
import { useCurrentUser } from '@/features/auth';

import type { EventAttendance } from '@/features/events/types';

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
 *   const { mutate: joinEvent, isLoading, error } = useJoinEvent();
 *
 *   const handleJoin = (status = 'attending') => {
 *     joinEvent({ eventId, status }, {
 *       onSuccess: () => {
 *         // User successfully joined event
 *       },
 *       onError: (error) => {
 *         console.error('Failed to join event:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => handleJoin('attending')} disabled={isLoading}>
 *         {isLoading ? 'Joining...' : 'Attend'}
 *       </button>
 *       <button onClick={() => handleJoin('maybe')} disabled={isLoading}>
 *         {isLoading ? 'Joining...' : 'Maybe'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJoinEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async ({
      eventId,
      status = 'attending',
    }: {
      eventId: string;
      status?: 'attending' | 'maybe';
    }): Promise<EventAttendance> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to join events');
      }

      const result = await joinEvent(supabase, eventId, currentUser.data.id, status);
      if (!result) {
        throw new Error('Failed to join event');
      }
      return result;
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate event queries to refresh attendee data
      queryClient.invalidateQueries({ queryKey: queryKeys.events.byId(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(eventId) });
      queryClient.invalidateQueries({ queryKey: ['events'] });

      logger.info('📅 API: Successfully joined event', {
        eventId,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to join event', { error });
    },
  });

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation],
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation],
    ),
  };
}