import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { useImageCommit } from '@/features/images';
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
  const commitImages = useImageCommit();

  const mutation = useMutation({
    mutationFn: async (data: ResourceData): Promise<ResourceInfo> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to create resources');
      }

      // Create the resource (returns ResourceInfo)
      const result = await createResource(supabase, data);
      if (!result) {
        throw new Error('Failed to create resource');
      }

      // Commit any temporary images to permanent storage
      if (data.imageUrls && data.imageUrls.length > 0) {
        logger.debug('📚 API: Committing resource images', {
          resourceId: result.id,
          imageCount: data.imageUrls.length,
        });

        try {
          const { permanentUrls } = await commitImages.mutateAsync({
            imageUrls: data.imageUrls,
            entityType: 'resource',
            entityId: result.id,
          });

          // Update the resource with permanent image URLs if they changed
          if (JSON.stringify(permanentUrls) !== JSON.stringify(data.imageUrls)) {
            // Import updateResource API here to avoid circular dependency
            const { updateResource } = await import('@/features/resources/api');
            
            const updatedResource = await updateResource(supabase, result.id, {
              imageUrls: permanentUrls,
            });

            if (updatedResource) {
              // Return the updated resource with permanent URLs
              return updatedResource;
            }
          }
        } catch (error) {
          logger.error('📚 API: Failed to commit resource images', {
            resourceId: result.id,
            error,
          });
          // Continue without throwing - resource was created successfully
          // We'll leave the temp URLs in place and rely on cleanup service
        }
      }

      return result;
    },
    onSuccess: (newResourceInfo: ResourceInfo) => {
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

  return mutation;
}
