import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { deleteThanks } from '../impl/deleteThanks';

export function useDeleteThanks() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteThanks,
    onSuccess: (_, thanksId) => {
      // Invalidate all thanks queries to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ['thanks'] });

      // Remove from specific thanks cache
      queryClient.removeQueries({ queryKey: ['thanks', { id: thanksId }] });

      logger.info('🙏 useDeleteThanks: Successfully deleted thanks', {
        id: thanksId,
      });
    },
    onError: (error) => {
      logger.error('🙏 useDeleteThanks: Failed to delete thanks', {
        error,
      });
    },
  });
}