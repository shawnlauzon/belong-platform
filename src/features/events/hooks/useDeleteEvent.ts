import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteEvent } from '@/features/events/api';

/**
 * Hook for deleting an event.
 *
 * Provides a mutation function for soft-deleting events.
 * Automatically removes event from cache on successful deletion.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function DeleteEventButton({ eventId }) {
 *   const { mutate: deleteEvent, isLoading, error } = useDeleteEvent();
 *
 *   const handleDelete = () => {
 *     if (!confirm('Are you sure you want to delete this event?')) {
 *       return;
 *     }
 *
 *     deleteEvent(eventId, {
 *       onSuccess: () => {
 *         // Redirect to events list
 *       },
 *       onError: (error) => {
 *         console.error('Failed to delete event:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={isLoading}
 *     >
 *       {isLoading ? 'Deleting...' : 'Delete Event'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return deleteEvent(supabase, id);
    },
    onSuccess: async (_, eventId) => {
      // Remove ALL events-related cache data synchronously first
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'events' || key[0] === 'event';
        },
      });

      // Then invalidate to trigger fresh fetches
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'events' || key[0] === 'event';
        },
      });

      logger.info('📅 API: Successfully deleted event', {
        id: eventId,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to delete event', { error });
    },
  });

  return mutation;
}