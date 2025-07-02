import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createResourceService } from '../services/resource.service';

/**
 * Hook for deleting a resource.
 * 
 * Provides a mutation function for deleting resources.
 * Automatically removes resource from cache on successful deletion.
 * 
 * @returns Delete resource mutation function
 * 
 * @example
 * ```tsx
 * function DeleteResourceButton({ resourceId }) {
 *   const deleteResource = useDeleteResource();
 *   const [isDeleting, setIsDeleting] = useState(false);
 *   
 *   const handleDelete = async () => {
 *     if (!confirm('Are you sure you want to delete this resource?')) {
 *       return;
 *     }
 *     
 *     setIsDeleting(true);
 *     try {
 *       await deleteResource(resourceId);
 *       // Redirect to resources list
 *     } catch (error) {
 *       console.error('Failed to delete resource:', error);
 *     } finally {
 *       setIsDeleting(false);
 *     }
 *   };
 *   
 *   return (
 *     <button 
 *       onClick={handleDelete}
 *       disabled={isDeleting}
 *     >
 *       {isDeleting ? 'Deleting...' : 'Delete Resource'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);

  const mutation = useMutation({
    mutationFn: (id: string) => resourceService.deleteResource(id),
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

      logger.info('📚 API: Successfully deleted resource', {
        id: resourceId,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to delete resource', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (id: string) => {
      return mutation.mutateAsync(id);
    },
    [mutation.mutateAsync]
  );
}