import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { createResource } from '@/features/resources/api';
import { useCurrentUser } from '@/features/auth';

import type { ResourceInfo, ResourceData } from '@/features/resources/types';

/**
 * Hook for creating a new resource.
 *
 * Provides a mutation function for creating resources (offers/requests).
 * Returns ResourceInfo (with ID references) rather than full composed Resource object.
 * Automatically invalidates resource caches on successful creation.
 *
 * @returns Create resource mutation function that returns Promise<ResourceInfo | null>
 *
 * @example
 * ```tsx
 * function CreateResourceForm({ communityId }) {
 *   const createResource = useCreateResource();
 *   const [formData, setFormData] = useState({
 *     type: 'offer',
 *     category: 'household',
 *     title: '',
 *     description: '',
 *     communityId,
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       // Returns ResourceInfo with ownerId and communityId (not full objects)
 *       const resourceInfo = await createResource(formData);
 *       console.log('Created resource:', resourceInfo.title);
 *       
 *       // To get full composed Resource with owner and community objects:
 *       // const fullResource = useResource(resourceInfo.id);
 *       
 *       // Redirect to resource page
 *       router.push(`/resources/${resourceInfo.id}`);
 *     } catch (error) {
 *       console.error('Failed to create resource:', error);
 *     }
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
 *       <button type="submit">Create Resource</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateResource(): (data: ResourceData) => Promise<ResourceInfo | null> {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async (data: ResourceData) => {
      if (!currentUser?.id) {
        throw new Error('User must be authenticated to create resources');
      }
      
      // Create the resource (returns ResourceInfo)
      return createResource(supabase, data, currentUser.id);
    },
    onSuccess: (newResourceInfo) => {
      if (!newResourceInfo) return;

      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      // Cache the ResourceInfo for potential useResource calls
      queryClient.setQueryData(
        queryKeys.resources.byId(newResourceInfo.id),
        newResourceInfo,
      );

      logger.info('📚 API: Successfully created resource', {
        id: newResourceInfo.id,
        title: newResourceInfo.title,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to create resource', { error });
    },
  });

  // Return function that creates and returns ResourceInfo
  return async (data: ResourceData): Promise<ResourceInfo | null> => {
    if (!currentUser) return null;
    
    return mutation.mutateAsync(data);
  };
}
