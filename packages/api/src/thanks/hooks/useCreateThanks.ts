import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';
import type { Thanks, ThanksData } from '@belongnetwork/types';

export function useCreateThanks() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const thanksService = createThanksService(supabase);

  return useMutation<Thanks, Error, ThanksData>({
    mutationFn: (data) => thanksService.createThanks(data),
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