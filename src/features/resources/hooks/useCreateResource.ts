import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { createResource } from '@/features/resources/api';

import type { Resource, ResourceInput } from '@/features/resources/types';
import { resourceKeys } from '../queries';
import { feedKeys } from '@/features/feed/queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

/**
 * Hook for creating a new resource.
 *
 * Provides a mutation function for creating resources (offers/requests).
 * Returns Resource (with ID references) rather than full composed Resource object.
 * Automatically invalidates resource caches on successful creation.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CreateResourceForm({ communityId }) {
 *   const { mutate, isLoading, error } = useCreateResource();
 *   const [formData, setFormData] = useState({
 *     type: 'offer',
 *     category: 'household',
 *     title: '',
 *     description: '',
 *     communityId,
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     mutate(formData, {
 *       onSuccess: (resourceInfo) => {
 *         console.log('Created resource:', resourceInfo.title);
 *         // To get full composed Resource with owner and community objects:
 *         // const fullResource = useResource(resourceInfo.id);
 *         router.push(`/resources/${resourceInfo.id}`);
 *       },
 *       onError: (error) => {
 *         console.error('Failed to create resource:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <select
 *         value={formData.type}
 *         onChange={(e) => setFormData({...formData, type: e.target.value})}
 *       >
 *         <option value="offer">Offer</option>
 *         <option value="request">Request</option>
 *       </select>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => setFormData({...formData, title: e.target.value})}
 *         placeholder="Title"
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *         placeholder="Description"
 *       />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Creating...' : 'Create Resource'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async (data: ResourceInput): Promise<Resource> => {
      // Create the resource (auto-commits images internally)
      const result = await createResource(supabase, data);
      if (!result) {
        throw new Error('Failed to create resource');
      }

      return result;
    },
    onSuccess: (newResource: Resource) => {
      queryClient.setQueryData(
        resourceKeys.detail(newResource.id),
        newResource,
      );

      // TODO Should be able to insert it into the appropriate place
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });

      queryClient.invalidateQueries({
        queryKey: feedKeys.all,
      });

      // Invalidate trust score for resource owner (they get +50 points for offers)
      if (newResource.type === 'offer') {
        newResource.communityIds.forEach((communityId) => {
          queryClient.invalidateQueries({
            queryKey: trustScoreKeys.detail({ 
              userId: newResource.ownerId, 
              communityId 
            }),
          });
        });
      }
    },
    onError: (error) => {
      logger.error('📚 API: Failed to create resource', { error });
    },
  });

  return mutation;
}
