import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceData } from '@belongnetwork/types';
import { createResource } from '../impl/createResource';

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource, Error, ResourceData>({
    mutationFn: createResource,
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
