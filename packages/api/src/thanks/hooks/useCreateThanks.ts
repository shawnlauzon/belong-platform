import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Thanks, ThanksData } from '@belongnetwork/types';
import { createThanks } from '../impl/createThanks';

export function useCreateThanks() {
  const queryClient = useQueryClient();

  return useMutation<Thanks, Error, ThanksData>({
    mutationFn: createThanks,
    onSuccess: (newThanks) => {
      // Invalidate all thanks queries to reflect the new thanks
      queryClient.invalidateQueries({ queryKey: ['thanks'] });

      // Update the cache for this specific thanks
      queryClient.setQueryData(['thanks', { id: newThanks.id }], newThanks);

      logger.info('🙏 useCreateThanks: Successfully created thanks', {
        id: newThanks.id,
        fromUserId: newThanks.fromUser.id,
        toUserId: newThanks.toUser.id,
        resourceId: newThanks.resource.id,
      });
    },
    onError: (error) => {
      logger.error('🙏 useCreateThanks: Failed to create thanks', {
        error,
      });
    },
  });
}