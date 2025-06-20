import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useClient } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';
import type { CommunityData } from '@belongnetwork/types';

export function useUpdateCommunity() {
  const client = useClient();
  const queryClient = useQueryClient();
  const communityService = createCommunityService(client);

  return useMutation({
    mutationFn: (data: CommunityData & { id: string }) => communityService.updateCommunity(data),
    onSuccess: (updatedCommunity) => {
      // Update the community in the cache
      queryClient.setQueryData(
        ['communities', updatedCommunity.id],
        updatedCommunity
      );

      // Invalidate the communities list to ensure it's up to date
      queryClient.invalidateQueries({ queryKey: ['communities'] });

      logger.info('🏘️ API: Successfully updated community via hook', {
        id: updatedCommunity.id,
        name: updatedCommunity.name,
      });
    },
    onError: (error, variables) => {
      logger.error('🏘️ API: Failed to update community via hook', {
        id: variables.id,
        error,
      });
    },
  });
}
