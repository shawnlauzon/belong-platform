import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Thanks, ThanksData } from '@belongnetwork/types';
import { updateThanks } from '../impl/updateThanks';

export function useUpdateThanks() {
  const queryClient = useQueryClient();

  return useMutation<Thanks, Error, Partial<ThanksData> & { id: string }>({
    mutationFn: updateThanks,
    onSuccess: (updatedThanks) => {
      // Invalidate all thanks queries to reflect the updated thanks
      queryClient.invalidateQueries({ queryKey: ['thanks'] });

      // Update the cache for this specific thanks
      queryClient.setQueryData(['thanks', { id: updatedThanks.id }], updatedThanks);

      logger.info('🙏 useUpdateThanks: Successfully updated thanks', {
        id: updatedThanks.id,
        fromUserId: updatedThanks.fromUser.id,
        toUserId: updatedThanks.toUser.id,
      });
    },
    onError: (error) => {
      logger.error('🙏 useUpdateThanks: Failed to update thanks', {
        error,
      });
    },
  });
}