import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveCommunity } from '../impl/leaveCommunity';
import { logger } from '@belongnetwork/core';

export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => leaveCommunity(communityId),
    onSuccess: (_, communityId) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-memberships', communityId] });
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] });
      
      logger.info('🏘️ API: Successfully left community via hook', {
        communityId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to leave community via hook', { error });
    },
  });
}