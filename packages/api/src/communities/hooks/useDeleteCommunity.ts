import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCommunity } from '../impl/deleteCommunity';
import { logger } from '@belongnetwork/core';

export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCommunity(id),
    onSuccess: (_, id) => {
      // Remove the community from the cache
      queryClient.removeQueries({ queryKey: ['communities', id] });
      
      // Invalidate the communities list to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      logger.info('🏘️ API: Successfully deleted community via hook', { id });
    },
    onError: (error, id) => {
      logger.error('🏘️ API: Failed to delete community via hook', { id, error });
    },
  });
}
