import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { updateCommunity } from '@/features/communities/api';

import type {
  CommunityData,
  CommunityInfo,
} from '@/features/communities/types';

/**
 * Hook for updating an existing community.
 *
 * Provides a mutation function for updating community information.
 * Automatically invalidates community caches on successful update.
 *
 * @returns Update community mutation function
 *
 * @example
 * ```tsx
 * function EditCommunityForm({ communityId }) {
 *   const updateCommunity = useUpdateCommunity();
 *   const { data: community } = useCommunity(communityId);
 *   const [formData, setFormData] = useState({
 *     name: community?.name || '',
 *     description: community?.description || ''
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await updateCommunity(communityId, formData);
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
 *       <button type="submit">Update Community</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommunityData> }) =>
      updateCommunity(supabase, { id, ...data }),
    onSuccess: (updatedCommunityInfo) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      if (updatedCommunityInfo) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.byId(updatedCommunityInfo.id),
        });

        logger.info('🏘️ API: Successfully updated community', {
          id: updatedCommunityInfo.id,
          name: updatedCommunityInfo.name,
        });
      }
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to update community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (
      id: string,
      data: Partial<CommunityData>,
    ): Promise<CommunityInfo | null> => {
      return mutation.mutateAsync({ id, data });
    },
    [mutation],
  );
}
