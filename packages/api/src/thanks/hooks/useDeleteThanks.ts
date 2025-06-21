import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';

export function useDeleteThanks() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const thanksService = createThanksService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (id) => thanksService.deleteThanks(id),
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