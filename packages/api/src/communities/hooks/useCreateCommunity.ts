import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useClient } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';
import type { CommunityData } from '@belongnetwork/types';

export function useCreateCommunity() {
  const client = useClient();
  const queryClient = useQueryClient();
  const communityService = createCommunityService(client);

  return useMutation({
    mutationFn: (data: CommunityData) => communityService.createCommunity(data),
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
