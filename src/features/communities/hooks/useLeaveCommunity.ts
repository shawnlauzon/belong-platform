import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { leaveCommunity } from '@/features/communities/api';
import { communityMembersKeys } from '../queries';

/**
 * Hook for leaving a community.
 *
 * Provides a mutation object for leaving communities.
 * Automatically invalidates community and membership caches on successful leave.
 *
 * @returns Leave community mutation object with mutate, mutateAsync, isLoading, isError, etc.
 *
 * @example
 * ```tsx
 * function LeaveCommunityButton({ communityId }) {
 *   const leaveCommunityMutation = useLeaveCommunity();
 *
 *   const handleLeave = async () => {
 *     if (!confirm('Are you sure you want to leave this community?')) {
 *       return;
 *     }
 *
 *     try {
 *       await leaveCommunityMutation.mutateAsync(communityId);
 *       // Successfully left community
 *     } catch (error) {
 *       console.error('Failed to leave community:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleLeave}
 *       disabled={leaveCommunityMutation.isPending}
 *     >
 *       {leaveCommunityMutation.isPending ? 'Leaving...' : 'Leave Community'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation<void, Error, string>({
    mutationFn: (communityId: string) => leaveCommunity(supabase, communityId),
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({
        queryKey: communityMembersKeys.list(communityId),
      });

      logger.info('🏘️ API: Successfully left community', {
        communityId,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to leave community', { error });
    },
  });
}
