import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { updateResource } from '../api';
import type { ResourceInput, Resource } from '../types';
import { resourceKeys } from '../queries';
import { feedKeys } from '@/features/feed/queries';

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
 *     updateResource({ id: resourceId, ...formData }, {
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
    mutationFn: async (
      updateData: Partial<ResourceInput> & { id: string },
    ): Promise<Resource> => {
      const result = await updateResource(supabase, updateData);
      if (!result) {
        throw new Error('Failed to update resource');
      }
      return result;
    },
    onSuccess: (updatedResource, variables) => {
      queryClient.invalidateQueries({
        queryKey: resourceKeys.detail(updatedResource.id),
      });

      // These are part of the ResourceSummary, so if they change, invalidate the lists.
      if (variables.title || variables.status || variables.type) {
        queryClient.invalidateQueries({
          queryKey: resourceKeys.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: feedKeys.all,
        });
      }

      logger.info('📚 API: Successfully updated resource', {
        id: updatedResource.id,
        title: updatedResource.title,
      });
    },
    onError: (error) => {
      logger.error('📚 API: Failed to update resource', { error });
    },
  });

  return mutation;
}
