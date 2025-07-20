import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteResource } from '@/features/resources/api';

/**
 * Hook for deleting a resource.
 *
 * Provides a mutation function for deleting resources.
 * Automatically removes resource from cache on successful deletion.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function DeleteResourceButton({ resourceId }) {
 *   const { mutate: deleteResource, isLoading, error } = useDeleteResource();
 *
 *   const handleDelete = () => {
 *     if (!confirm('Are you sure you want to delete this resource?')) {
 *       return;
 *     }
 *
 *     deleteResource(resourceId, {
 *       onSuccess: () => {
 *         // Redirect to resources list
 *       },
 *       onError: (error) => {
 *         console.error('Failed to delete resource:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={isLoading}
 *     >
 *       {isLoading ? 'Deleting...' : 'Delete Resource'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteResource(supabase, id),
    onSuccess: async (_, resourceId) => {
      // Remove ALL resources-related cache data synchronously first
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'resources' || key[0] === 'resource';
        },
      });

      // Then invalidate to trigger fresh fetches
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'resources' || key[0] === 'resource';
        },
      });

      // Invalidate feed to remove deleted resource
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });

      logger.info('📚 API: Successfully deleted resource', {
        id: resourceId,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to delete resource', { error });
    },
  });

  return mutation;
}
