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
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditResourceForm({ resourceId }) {
 *   const { mutate: updateResource, isLoading, error } = useUpdateResource();
 *   const { data: resource } = useResource(resourceId);
 *   const [formData, setFormData] = useState({
 *     title: resource?.title || '',
 *     description: resource?.description || '',
 *     isActive: resource?.isActive ?? true
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     updateResource({ id: resourceId, data: formData }, {
 *       onSuccess: () => {
 *         // Resource updated successfully
 *       },
 *       onError: (error) => {
 *         console.error('Failed to update resource:', error);
 *       }
 *     });
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
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Updating...' : 'Update Resource'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ResourceData>;
    }): Promise<ResourceInfo> => {
      const result = await updateResource(supabase, id, data);
      if (!result) {
        throw new Error('Failed to update resource');
      }
      return result;
    },
    onSuccess: (updatedResource: ResourceInfo) => {
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

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation],
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation],
    ),
  };
}
