import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { createResource } from '@/features/resources/api';
import { useCurrentUser } from '@/features/auth';

import type { Resource, ResourceInput } from '@/features/resources/types';

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
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async (data: ResourceInput): Promise<Resource> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to create resources');
      }

      // Create the resource (auto-commits images internally)
      const result = await createResource(supabase, data);
      if (!result) {
        throw new Error('Failed to create resource');
      }

      return result;
    },
    onSuccess: (newResource: Resource) => {
      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      // Invalidate the specific resource to force fresh fetch with nested objects
      queryClient.invalidateQueries({
        queryKey: queryKeys.resources.byId(newResource.id),
      });

      logger.info('📚 API: Successfully created resource', {
        id: newResource.id,
        title: newResource.title,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to create resource', { error });
    },
  });

  return mutation;
}
