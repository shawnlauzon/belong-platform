import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { updateResource } from '@/features/resources/api';

import type { ResourceData, ResourceInfo } from '@/features/resources/types';

/**
 * Hook for updating an existing resource.
 *
 * Provides a mutation function for updating resource information.
 * Automatically invalidates resource caches on successful update.
 *
 * @returns Update resource mutation function
 *
 * @example
 * ```tsx
 * function EditResourceForm({ resourceId }) {
 *   const updateResource = useUpdateResource();
 *   const { data: resource } = useResource(resourceId);
 *   const [formData, setFormData] = useState({
 *     title: resource?.title || '',
 *     description: resource?.description || '',
 *     isActive: resource?.isActive ?? true
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await updateResource(resourceId, formData);
 *       // Resource updated successfully
 *     } catch (error) {
 *       console.error('Failed to update resource:', error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => setFormData({...formData, title: e.target.value})}
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *       />
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={formData.isActive}
 *           onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
 *         />
 *         Active
 *       </label>
 *       <button type="submit">Update Resource</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateResource(): (
  id: string,
  data: Partial<ResourceData>,
) => Promise<ResourceInfo | null> {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResourceData> }) =>
      updateResource(supabase, id, data),
    onSuccess: (updatedResource) => {
      if (!updatedResource) return;

      // Invalidate all resources queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      // Update the cache for this specific resource
      queryClient.setQueryData(
        queryKeys.resources.byId(updatedResource.id),
        updatedResource,
      );

      logger.info('📚 API: Successfully updated resource', {
        id: updatedResource.id,
        title: updatedResource.title,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to update resource', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (id: string, data: Partial<ResourceData>) => {
      return mutation.mutateAsync({ id, data });
    },
    [mutation.mutateAsync],
  );
}
