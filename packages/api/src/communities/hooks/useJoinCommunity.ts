import { useMutation, useQueryClient } from '@tanstack/react-query';
import { joinCommunity } from '../impl/joinCommunity';
import { logger } from '@belongnetwork/core';

type JoinCommunityInput = {
  communityId: string;
  role?: 'member' | 'admin' | 'organizer';
};

export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ communityId, role = 'member' }: JoinCommunityInput) =>
      joinCommunity(communityId, role),
    onSuccess: (newMembership) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', newMembership.communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-memberships', newMembership.communityId] });
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] });
      
      logger.info('🏘️ API: Successfully joined community via hook', {
        communityId: newMembership.communityId,
        userId: newMembership.userId,
        role: newMembership.role,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to join community via hook', { error });
    },
  });
}