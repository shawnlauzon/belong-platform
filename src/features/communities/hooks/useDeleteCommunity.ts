import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteCommunity } from '@/features/communities/api';
import { communityKeys } from '../queries';

/**
 * Hook for deleting a community.
 *
 * Provides a mutation object for deleting communities.
 * Automatically removes community from cache on successful deletion.
 *
 * @returns Delete community mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function DeleteCommunityButton({ communityId }) {
 *   const deleteCommunityMutation = useDeleteCommunity();
 *
 *   const handleDelete = async () => {
 *     if (!confirm('Are you sure you want to delete this community?')) {
 *       return;
 *     }
 *
 *     try {
 *       await deleteCommunityMutation.mutateAsync(communityId);
 *       // Redirect to communities list
 *     } catch (error) {
 *       console.error('Failed to delete community:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={deleteCommunityMutation.isPending}
 *     >
 *       {deleteCommunityMutation.isPending ? 'Deleting...' : 'Delete Community'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (id: string) => deleteCommunity(supabase, id),
    onSuccess: (_, communityId) => {
      // Invalidate all lists of communities
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });

      // And remove this one specifically
      queryClient.removeQueries({
        queryKey: communityKeys.detail(communityId),
      });

      logger.info('🏘️ API: Successfully deleted community', {
        id: communityId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to delete community', { error });
    },
  });
}
