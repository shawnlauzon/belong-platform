import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';
import type { Thanks, ThanksData } from '@belongnetwork/types';

export function useUpdateThanks() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const thanksService = createThanksService(supabase);

  return useMutation<Thanks, Error, Partial<ThanksData> & { id: string }>({
    mutationFn: ({ id, ...data }) => thanksService.updateThanks(id, data),
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