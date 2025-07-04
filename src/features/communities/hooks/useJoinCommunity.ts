import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createCommunityService } from '../services/community.service';

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
 * @example
 * ```tsx
 * // Join with specific role
 * function JoinAsAdmin({ communityId }) {
 *   const joinCommunity = useJoinCommunity();
 *   
 *   const handleJoinAsAdmin = async () => {
 *     try {
 *       await joinCommunity(communityId, 'admin');
 *       // Joined as admin
 *     } catch (error) {
 *       console.error('Failed to join as admin:', error);
 *     }
 *   };
 *   
 *   return <button onClick={handleJoinAsAdmin}>Join as Admin</button>;
 * }
 * ```
 */
export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  const mutation = useMutation({
    mutationFn: ({ communityId, role = 'member' }: { 
      communityId: string; 
      role?: 'member' | 'admin' | 'organizer' 
    }) => communityService.joinCommunity(communityId, role),
    onSuccess: (newMembership) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(newMembership.communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(newMembership.communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.userMemberships(newMembership.userId),
      });

      logger.info('🏘️ API: Successfully joined community', {
        communityId: newMembership.communityId,
        userId: newMembership.userId,
        role: newMembership.role,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to join community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (communityId: string, role?: 'member' | 'admin' | 'organizer') => {
      return mutation.mutateAsync({ communityId, role });
    },
    [mutation.mutateAsync]
  );
}