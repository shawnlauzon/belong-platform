import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCommunity } from '../impl/createCommunity';
import { logger } from '@belongnetwork/core';

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommunity,
    onSuccess: (newCommunity) => {
      // Invalidate the communities list to reflect the new community
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      logger.info('🏘️ API: Successfully created community via hook', {
        id: newCommunity.id,
        name: newCommunity.name,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community via hook', { error });
    },
  });
}
