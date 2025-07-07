import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { commitImageUrls } from '@/features/images';
import { createCommunity } from '@/features/communities/api';

import type {
  CommunityData,
} from '@/features/communities/types';

/**
 * Hook for creating a new community.
 *
 * Provides a mutation object for creating communities.
 * Automatically invalidates community caches on successful creation.
 *
 * @returns Create community mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function CreateCommunityForm() {
 *   const createCommunityMutation = useCreateCommunity();
 *   const [formData, setFormData] = useState({
 *     name: '',
 *     description: '',
 *     category: 'social',
 *     organizerId: 'user-123',
 *     isActive: true
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       const community = await createCommunityMutation.mutateAsync(formData);
 *       console.log('Created community:', community.name);
 *       // Redirect to community page
 *     } catch (error) {
 *       console.error('Failed to create community:', error);
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
 *       <button type="submit" disabled={createCommunityMutation.isPending}>
 *         {createCommunityMutation.isPending ? 'Creating...' : 'Create Community'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (data: CommunityData) => {
      // Create the community first
      const result = await createCommunity(supabase, data);
      if (!result) {
        throw new Error('Failed to create community');
      }

      // Commit banner image if present and is temporary
      if (data.bannerImageUrl) {
        logger.debug('🏘️ API: Committing community banner image', {
          communityId: result.id,
          bannerImageUrl: data.bannerImageUrl,
        });

        try {
          const permanentUrls = await commitImageUrls(
            [data.bannerImageUrl],
            'community',
            result.id,
            supabase
          );

          // Update the community with permanent banner URL if it changed
          if (permanentUrls.length > 0 && permanentUrls[0] !== data.bannerImageUrl) {
            // Import updateCommunity API here to avoid circular dependency
            const { updateCommunity } = await import('@/features/communities/api');
            
            const updatedCommunity = await updateCommunity(supabase, {
              id: result.id,
              bannerImageUrl: permanentUrls[0],
            });

            if (updatedCommunity) {
              // Return the updated community with permanent URL
              return updatedCommunity;
            }
          }
        } catch (error) {
          logger.error('🏘️ API: Failed to commit community banner image', {
            communityId: result.id,
            error,
          });
          // Continue without throwing - community was created successfully
          // We'll leave the temp URL in place and rely on cleanup service
        }
      }

      return result;
    },
    onSuccess: (newCommunityInfo) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });

      // Also invalidate membership queries since organizer is auto-added as member
      if (newCommunityInfo) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.memberships(newCommunityInfo.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.userMemberships(
            newCommunityInfo.organizerId,
          ),
        });

        logger.info('🏘️ API: Successfully created community', {
          id: newCommunityInfo.id,
          name: newCommunityInfo.name,
        });
      }
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community', { error });
    },
  });
}
