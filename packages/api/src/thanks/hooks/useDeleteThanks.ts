import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Thanks } from '@belongnetwork/types';
import { deleteThanks } from '../impl/deleteThanks';

export function useDeleteThanks() {
  const queryClient = useQueryClient();

  return useMutation<Thanks | null, Error, string>({
    mutationFn: deleteThanks,
    onSuccess: (deletedThanks, thanksId) => {
      // Invalidate all thanks queries to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ['thanks'] });

      // Remove from specific thanks cache
      queryClient.removeQueries({ queryKey: ['thanks', { id: thanksId }] });

      if (deletedThanks) {
        logger.info('🙏 useDeleteThanks: Successfully deleted thanks', {
          id: deletedThanks.id,
          fromUserId: deletedThanks.fromUser.id,
          toUserId: deletedThanks.toUser.id,
        });
      } else {
        logger.info('🙏 useDeleteThanks: Thanks was already deleted', {
          id: thanksId,
        });
      }
    },
    onError: (error) => {
      logger.error('🙏 useDeleteThanks: Failed to delete thanks', {
        error,
      });
    },
  });
}