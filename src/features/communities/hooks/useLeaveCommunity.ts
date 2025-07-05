import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { leaveCommunity } from '@/features/communities/api';

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

  const mutation = useMutation<void, Error, string>({
    mutationFn: (communityId: string) => leaveCommunity(supabase, communityId),
    onSuccess: (_, communityId) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.byId(communityId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(communityId),
      });
      // Invalidate all user memberships since we don't have the userId here
      queryClient.invalidateQueries({
        queryKey: ['communities', 'userMemberships'],
      });

      logger.info('🏘️ API: Successfully left community', {
        communityId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to leave community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (communityId: string): Promise<void> => {
      return mutation.mutateAsync(communityId);
    },
    [mutation],
  );
}
