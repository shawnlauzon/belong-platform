import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { joinCommunityWithCode } from '@/features/communities/api';
import {
  communityKeys,
  communityMembersKeys,
  userCommunitiesKeys,
} from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';
import { invitationKeys } from '@/features/invitations/queries';
import { connectionKeys } from '@/features/connections/queries';
import { useCurrentUser } from '@/features/auth';

/**
 * Hook for joining a community using a connection code.
 *
 * Provides a mutation object for joining communities using a member's connection code.
 * This will both join the community and create a connection request with the code owner.
 * Automatically invalidates community, membership, and connection caches on successful join.
 *
 * @returns Join community with code mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function JoinWithCodeButton() {
 *   const joinWithCodeMutation = useJoinCommunityWithCode();
 *
 *   const handleJoin = async (code: string) => {
 *     try {
 *       await joinWithCodeMutation.mutateAsync(code);
 *       // Successfully joined community and created connection request
 *     } catch (error) {
 *       console.error('Failed to join community with code:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={() => handleJoin('ABCD1234')}
 *       disabled={joinWithCodeMutation.isPending}
 *     >
 *       {joinWithCodeMutation.isPending ? 'Joining...' : 'Join with Code'}
 *     </button>
 *   );
 * }
 * ```
 *
 */
export function useJoinCommunityWithCode() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: (code: string) => {
      if (!currentUser) {
        throw new Error('User must be authenticated to join a community');
      }
      return joinCommunityWithCode(supabase, currentUser.id, code);
    },
    onSuccess: (newMembership) => {
      // Invalidate community lists (memberCount changed)
      queryClient.invalidateQueries({ queryKey: communityKeys.lists() });

      // Invalidate community members list
      queryClient.invalidateQueries({
        queryKey: communityMembersKeys.list(newMembership.communityId),
      });

      // Invalidate user's community list since they now have a new membership
      queryClient.invalidateQueries({
        queryKey: userCommunitiesKeys.list(newMembership.userId),
      });

      // Invalidate trust score for the new member (they get +50 points for joining)
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.listByUser(newMembership.userId),
      });

      // Invalidate connection-related queries since we created a connection request
      queryClient.invalidateQueries({
        queryKey: invitationKeys.pendingConnections(newMembership.communityId),
      });

      queryClient.invalidateQueries({
        queryKey: connectionKeys.userConnections(),
      });

      logger.info('🏘️ API: Successfully joined community with code', {
        communityId: newMembership.communityId,
        userId: newMembership.userId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to join community with code', { error });
    },
  });
}