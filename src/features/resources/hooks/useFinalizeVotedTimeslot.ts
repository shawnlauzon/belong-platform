import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { finalizeVotedTimeslot } from '../api';
import { resourceKeys, resourceClaimsKeys, resourceTimeslotKeys } from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

export type FinalizeVotedTimeslotInput = {
  resourceId: string;
  chosenTimeslotId: string;
};

export function useFinalizeVotedTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<void, Error, FinalizeVotedTimeslotInput>({
    mutationFn: ({ resourceId, chosenTimeslotId }: FinalizeVotedTimeslotInput) =>
      finalizeVotedTimeslot(supabase, resourceId, chosenTimeslotId),
    onSuccess: (_, { resourceId }) => {
      // Invalidate resource (status changed from voting to scheduled)
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(resourceId) });
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });

      // Invalidate timeslots (statuses changed: chosen → active, others → cancelled)
      queryClient.invalidateQueries({
        queryKey: resourceTimeslotKeys.listByResource(resourceId),
      });

      // Invalidate claims (vote claims converted to attendance)
      queryClient.invalidateQueries({ queryKey: resourceClaimsKeys.listByResource(resourceId) });

      // Invalidate trust scores (new attendees may affect scores)
      queryClient.invalidateQueries({ queryKey: trustScoreKeys.lists() });
    },
    onError: (error: Error) => {
      logger.error('📚 API: Failed to finalize voted timeslot', { error });
    },
  });
}
