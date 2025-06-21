import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createResourceService } from '../services/resource.service';
import type { Resource, ResourceData } from '@belongnetwork/types';

export function useCreateResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const resourceService = createResourceService(supabase);

  return useMutation<Resource, Error, ResourceData>({
    mutationFn: (data) => resourceService.createResource(data),
    onSuccess: (newResource) => {
      // Invalidate the resources list to reflect the new resource
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      // Update the cache for this specific resource
      queryClient.setQueryData(['resources', newResource.id], newResource);

      logger.info('📚 useCreateResource: Successfully created resource', {
        id: newResource.id,
        title: newResource.title,
      });
    },
    onError: (error) => {
      logger.error('📚 useCreateResource: Failed to create resource', {
        error,
      });
    },
  });
}
