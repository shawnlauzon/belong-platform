import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { joinGathering } from '../api';
import { useCurrentUser } from '@/features/auth';

/**
 * Hook for joining a gathering.
 *
 * Provides a mutation function for users to join gatherings.
 * Automatically invalidates gathering caches on successful join.
 *
 * @returns React Query mutation result with join function and state
 *
 * @example
 * ```tsx
 * function JoinGatheringButton({ gatheringId }) {
 *   const joinGatheringMutation = useJoinGathering();
 *
 *   const handleJoin = async (status = 'attending') => {
 *     try {
 *       await joinGatheringMutation.mutateAsync({ gatheringId, status });
 *       // Successfully joined gathering
 *     } catch (error) {
 *       console.error('Failed to join gathering:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button 
 *         onClick={() => handleJoin('attending')} 
 *         disabled={joinGatheringMutation.isPending}
 *       >
 *         {joinGatheringMutation.isPending ? 'Joining...' : 'Attend'}
 *       </button>
 *       <button 
 *         onClick={() => handleJoin('maybe')} 
 *         disabled={joinGatheringMutation.isPending}
 *       >
 *         {joinGatheringMutation.isPending ? 'Joining...' : 'Maybe'}
 *       </button>
 *       {joinGatheringMutation.error && (
 *         <div className="error">{joinGatheringMutation.error.message}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJoinGathering() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      gatheringId,
      status = 'attending',
    }: {
      gatheringId: string;
      status?: 'attending' | 'maybe';
    }) => joinGathering(supabase, gatheringId, status),
    onSuccess: (attendance, { gatheringId }) => {
      if (attendance) {
        // Invalidate gathering queries to refresh attendee data
        queryClient.invalidateQueries({ queryKey: queryKeys.gatherings.byId(gatheringId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.gatherings.attendees(gatheringId) });
        queryClient.invalidateQueries({ queryKey: ['gatherings'] });

        // Invalidate all user data (including activities) using hierarchical invalidation
        if (currentUser?.id) {
          queryClient.invalidateQueries({ queryKey: ['user', currentUser.id] });
        }

        logger.info('📅 API: Successfully joined gathering', {
          gatheringId,
          userId: attendance.userId,
          status: attendance.status,
        });
      }
    },
    onError: (error) => {
      logger.error('📅 API: Failed to join gathering', { error });
    },
  });
}