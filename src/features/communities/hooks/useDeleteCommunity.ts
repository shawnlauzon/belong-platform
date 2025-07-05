import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteCommunity } from '@/features/communities/api';

/**
 * Hook for deleting a community.
 *
 * Provides a mutation function for deleting communities.
 * Automatically removes community from cache on successful deletion.
 *
 * @returns Delete community mutation function
 *
 * @example
 * ```tsx
 * function DeleteCommunityButton({ communityId }) {
 *   const deleteCommunity = useDeleteCommunity();
 *   const [isDeleting, setIsDeleting] = useState(false);
 *
 *   const handleDelete = async () => {
 *     if (!confirm('Are you sure you want to delete this community?')) {
 *       return;
 *     }
 *
 *     setIsDeleting(true);
 *     try {
 *       await deleteCommunity(communityId);
 *       // Redirect to communities list
 *     } catch (error) {
 *       console.error('Failed to delete community:', error);
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
 *       {isDeleting ? 'Deleting...' : 'Delete Community'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteCommunity(supabase, id),
    onSuccess: (_, communityId) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.removeQueries({
        queryKey: queryKeys.communities.byId(communityId),
      });

      logger.info('🏘️ API: Successfully deleted community', {
        id: communityId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to delete community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (id: string): Promise<void> => {
      return mutation.mutateAsync(id);
    },
    [mutation],
  );
}
