import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createResourceService } from '../services/resource.service';

export function useDeleteResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const resourceService = createResourceService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (id) => resourceService.deleteResource(id),
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
