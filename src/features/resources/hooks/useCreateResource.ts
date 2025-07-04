import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { createResource } from '@/features/resources/api';
import { useCurrentUser } from '@/features/auth';

import type { ResourceData } from '@/features/resources/types';

/**
 * Hook for creating a new resource.
 * 
 * Provides a mutation function for creating resources (offers/requests).
 * Automatically invalidates resource caches on successful creation.
 * 
 * @returns Create resource mutation function
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
 *     isActive: true
 *   });
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       const resource = await createResource(formData);
 *       console.log('Created resource:', resource.title);
 *       // Redirect to resource page
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
export function useCreateResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async (data: ResourceData) => {
      if (!currentUser?.id) {
        throw new Error('User must be authenticated to create resources');
      }
      return createResource(supabase, data, currentUser.id);
    },
    onSuccess: (newResource) => {
      if (!newResource) return;
      
      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      // Update the cache for this specific resource
      queryClient.setQueryData(
        queryKeys.resources.byId(newResource.id),
        newResource
      );

      logger.info('📚 API: Successfully created resource', {
        id: newResource.id,
        title: newResource.title,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to create resource', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (data: ResourceData) => {
      return mutation.mutateAsync(data);
    },
    [mutation.mutateAsync]
  );
}