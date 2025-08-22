import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteResource } from '@/features/resources/api';
import { resourceKeys } from '../queries';
import { feedKeys } from '@/features/feed/queries';
import { Resource } from '../types';

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
    onSuccess: async (resource: Resource) => {
      if (resource) {
        queryClient.removeQueries({
          queryKey: resourceKeys.detail(resource.id),
        });

        // TODO Only remove affected lists
        queryClient.invalidateQueries({
          queryKey: resourceKeys.lists(),
        });

        queryClient.invalidateQueries({
          queryKey: feedKeys.all,
        });

        logger.info('📚 API: Successfully deleted resource', {
          id: resource.id,
        });
      }
    },
    onError: (error: Error) => {
      logger.error('📚 API: Failed to delete resource', { error });
    },
  });

  return mutation;
}
