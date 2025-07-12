import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteGathering } from '../api';

/**
 * Hook for deleting a gathering.
 *
 * Provides a mutation function for soft-deleting gatherings.
 * Automatically removes gathering from cache on successful deletion.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function DeleteGatheringButton({ gatheringId }) {
 *   const { mutate: deleteGathering, isLoading, error } = useDeleteGathering();
 *
 *   const handleDelete = () => {
 *     if (!confirm('Are you sure you want to delete this gathering?')) {
 *       return;
 *     }
 *
 *     deleteGathering(gatheringId, {
 *       onSuccess: () => {
 *         // Redirect to gatherings list
 *       },
 *       onError: (error) => {
 *         console.error('Failed to delete gathering:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={isLoading}
 *     >
 *       {isLoading ? 'Deleting...' : 'Delete Gathering'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteGathering() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return deleteGathering(supabase, id);
    },
    onSuccess: async (_, gatheringId) => {
      // Remove ALL gatherings-related cache data synchronously first
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

      logger.info('📅 API: Successfully deleted gathering', {
        id: gatheringId,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to delete gathering', { error });
    },
  });

  return mutation;
}