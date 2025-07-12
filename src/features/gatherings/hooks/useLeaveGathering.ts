import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { leaveGathering } from '../api';
import { useCurrentUser } from '@/features/auth';

/**
 * Hook for leaving a gathering.
 *
 * Provides a mutation function for users to leave gatherings.
 * Automatically invalidates gathering caches on successful leave.
 *
 * @returns React Query mutation result with leave function and state
 *
 * @example
 * ```tsx
 * function LeaveGatheringButton({ gatheringId }) {
 *   const { mutate: leaveGathering, isLoading, error } = useLeaveGathering();
 *
 *   const handleLeave = () => {
 *     if (!confirm('Are you sure you want to leave this gathering?')) {
 *       return;
 *     }
 *
 *     leaveGathering(gatheringId, {
 *       onSuccess: () => {
 *         // User successfully left gathering
 *       },
 *       onError: (error) => {
 *         console.error('Failed to leave gathering:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleLeave} disabled={isLoading}>
 *       {isLoading ? 'Leaving...' : 'Leave Gathering'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLeaveGathering() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: (gatheringId: string) => leaveGathering(supabase, gatheringId),
    onSuccess: (_, gatheringId) => {
      // Invalidate gathering queries to refresh attendee data
      queryClient.invalidateQueries({ queryKey: queryKeys.gatherings.byId(gatheringId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gatherings.attendees(gatheringId) });
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });

      // Invalidate all user data (including activities) using hierarchical invalidation
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['user', currentUser.id] });
      }

      logger.info('📅 API: Successfully left gathering', {
        gatheringId,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to leave gathering', { error });
    },
  });
}