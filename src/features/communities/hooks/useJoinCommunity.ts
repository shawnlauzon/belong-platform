import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { joinCommunity } from '@/features/communities/api';

import type { CommunityMembershipInfo } from '@/features/communities/types';

/**
 * Hook for joining a community.
 *
 * Provides a mutation function for joining communities as a member.
 * Automatically invalidates community and membership caches on successful join.
 *
 * @returns Join community mutation function
 *
 * @example
 * ```tsx
 * function JoinCommunityButton({ communityId }) {
 *   const joinCommunity = useJoinCommunity();
 *   const [isJoining, setIsJoining] = useState(false);
 *
 *   const handleJoin = async () => {
 *     setIsJoining(true);
 *     try {
 *       await joinCommunity(communityId);
 *       // Successfully joined community
 *     } catch (error) {
 *       console.error('Failed to join community:', error);
 *     } finally {
 *       setIsJoining(false);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleJoin}
 *       disabled={isJoining}
 *     >
 *       {isJoining ? 'Joining...' : 'Join Community'}
 *     </button>
 *   );
 * }
 * ```
 *
 */
export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({ communityId }: { communityId: string }) =>
      joinCommunity(supabase, communityId),
    onSuccess: (newMembership) => {
      if (newMembership) {
        // Invalidate all communities queries
        queryClient.invalidateQueries({ queryKey: ['communities'] });
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.byId(newMembership.communityId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.memberships(
            newMembership.communityId,
          ),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.communities.userMemberships(newMembership.userId),
        });

        logger.info('🏘️ API: Successfully joined community', {
          communityId: newMembership.communityId,
          userId: newMembership.userId,
        });
      }
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to join community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (communityId: string): Promise<CommunityMembershipInfo | null> => {
      return mutation.mutateAsync({ communityId });
    },
    [mutation],
  );
}
