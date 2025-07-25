import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { createCommunity } from '@/features/communities/api';

import type { CommunityInput } from '@/features/communities/types';
import { communityKeys } from '../queries';

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
    mutationFn: async (data: CommunityInput) => {
      // Create the community (auto-commits images internally)
      const result = await createCommunity(supabase, data);
      if (!result) {
        throw new Error('Failed to create community');
      }

      return result;
    },
    onSuccess: (newCommunity) => {
      // Invalidate all lists of communities
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });

      logger.info('🏘️ API: Successfully created community', {
        id: newCommunity.id,
        name: newCommunity.name,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community', { error });
    },
  });
}
