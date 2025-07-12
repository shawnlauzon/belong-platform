import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { updateCommunity } from '@/features/communities/api';

import type {
  CommunityInput,
} from '@/features/communities/types';

/**
 * Hook for updating an existing community.
 *
 * Provides a mutation object for updating community information.
 * Automatically invalidates community caches on successful update.
 *
 * @returns Update community mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function EditCommunityForm({ communityId }) {
 *   const updateCommunityMutation = useUpdateCommunity();
 *   const { data: community } = useCommunity(communityId);
 *   const [formData, setFormData] = useState({
 *     name: community?.name || '',
 *     description: community?.description || ''
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await updateCommunityMutation.mutateAsync({ id: communityId, ...formData });
 *       // Community updated successfully
 *     } catch (error) {
 *       console.error('Failed to update community:', error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.name}
 *         onChange={(e) => setFormData({...formData, name: e.target.value})}
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *       />
 *       <button type="submit" disabled={updateCommunityMutation.isPending}>
 *         {updateCommunityMutation.isPending ? 'Updating...' : 'Update Community'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (updateData: Partial<CommunityInput> & { id: string }) =>
      updateCommunity(supabase, updateData),
    onSuccess: (updatedCommunity) => {
      // Clear entire cache since community data (name, etc) is embedded in many entities
      queryClient.invalidateQueries();

      if (updatedCommunity) {
        logger.info('🏘️ API: Successfully updated community', {
          id: updatedCommunity.id,
          name: updatedCommunity.name,
        });
      }
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to update community', { error });
    },
  });
}
