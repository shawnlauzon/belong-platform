import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceData } from '@belongnetwork/types';
import { updateResource } from '../impl/updateResource';

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource, Error, Partial<ResourceData> & { id: string }>({
    mutationFn: updateResource,
    onSuccess: (updatedResource) => {
      // Invalidate the resources list and the specific resource
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({
        queryKey: ['resources', updatedResource.id],
      });

      // Optimistically update the cache
      queryClient.setQueryData(
        ['resources', updatedResource.id],
        updatedResource
      );

      logger.info('📚 useUpdateResource: Successfully updated resource', {
        id: updatedResource.id,
        title: updatedResource.title,
      });
    },
    onError: (error, variables) => {
      logger.error('📚 useUpdateResource: Failed to update resource', {
        id: variables.id,
        error,
      });
    },
  });
}
