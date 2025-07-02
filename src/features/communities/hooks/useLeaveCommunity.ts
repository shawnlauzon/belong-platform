import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createCommunityService } from '../services/community.service';

/**
 * Hook for leaving a community.
 * 
 * Provides a mutation function for leaving communities.
 * Automatically invalidates community and membership caches on successful leave.
 * 
 * @returns Leave community mutation function
 * 
 * @example
 * ```tsx
 * function LeaveCommunityButton({ communityId }) {
 *   const leaveCommunity = useLeaveCommunity();
 *   const [isLeaving, setIsLeaving] = useState(false);
 *   
 *   const handleLeave = async () => {
 *     if (!confirm('Are you sure you want to leave this community?')) {
 *       return;
 *     }
 *     
 *     setIsLeaving(true);
 *     try {
 *       await leaveCommunity(communityId);
 *       // Successfully left community
 *     } catch (error) {
 *       console.error('Failed to leave community:', error);
 *     } finally {
 *       setIsLeaving(false);
 *     }
 *   };
 *   
 *   return (
 *     <button 
 *       onClick={handleLeave}
 *       disabled={isLeaving}
 *     >
 *       {isLeaving ? 'Leaving...' : 'Leave Community'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  const mutation = useMutation({
    mutationFn: (communityId: string) =>
      communityService.leaveCommunity(communityId),
    onSuccess: (result, communityId) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.userMemberships(result.userId),
      });

      logger.info('🏘️ API: Successfully left community', {
        communityId,
        userId: result.userId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to leave community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (communityId: string) => {
      return mutation.mutateAsync(communityId);
    },
    [mutation.mutateAsync]
  );
}