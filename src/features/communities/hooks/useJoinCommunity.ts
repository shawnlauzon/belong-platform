import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { joinCommunity } from '@/features/communities/api';
import { communityMembersKeys, userCommunitiesKeys } from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

/**
 * Hook for joining a community.
 *
 * Provides a mutation object for joining communities as a member.
 * Automatically invalidates community and membership caches on successful join.
 *
 * @returns Join community mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function JoinCommunityButton({ communityId }) {
 *   const joinCommunityMutation = useJoinCommunity();
 *
 *   const handleJoin = async () => {
 *     try {
 *       await joinCommunityMutation.mutateAsync(communityId);
 *       // Successfully joined community
 *     } catch (error) {
 *       console.error('Failed to join community:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleJoin}
 *       disabled={joinCommunityMutation.isPending}
 *     >
 *       {joinCommunityMutation.isPending ? 'Joining...' : 'Join Community'}
 *     </button>
 *   );
 * }
 * ```
 *
 */
export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (communityId: string) => joinCommunity(supabase, communityId),
    onSuccess: (newMembership) => {
      queryClient.invalidateQueries({
        queryKey: communityMembersKeys.list(newMembership.communityId),
      });

      // Invalidate user's community list since they now have a new membership
      queryClient.invalidateQueries({
        queryKey: userCommunitiesKeys.list(newMembership.userId),
      });

      // Invalidate trust score for the new member (they get +50 points)
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.listByUser(newMembership.userId),
      });

      logger.info('🏘️ API: Successfully joined community', {
        communityId: newMembership.communityId,
        userId: newMembership.userId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to join community', { error });
    },
  });
}
