import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { deleteResource } from '../impl/deleteResource';
import type { Resource } from '@belongnetwork/types';

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource | null, Error, string>({
    mutationFn: deleteResource,
    onSuccess: (_, id) => {
      // Invalidate the resources list and the specific resource
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      
      // Remove the deleted resource from the cache
      queryClient.removeQueries({ 
        queryKey: ['resources', id],
        exact: true 
      });
      
      logger.info('📚 useDeleteResource: Successfully deleted resource', { id });
    },
    onError: (error, id) => {
      logger.error('📚 useDeleteResource: Failed to delete resource', { 
        id, 
        error 
      });
    },
  });
}
