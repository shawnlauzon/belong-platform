import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateCommitmentLevel } from '../api';
import { ResourceClaim, CommitmentLevel } from '../types';
import { resourceClaimsKeys } from '../queries';

export function useUpdateCommitmentLevel() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    ResourceClaim,
    Error,
    { claimId: string; commitmentLevel: CommitmentLevel }
  >({
    mutationFn: ({ claimId, commitmentLevel }) =>
      updateCommitmentLevel(supabase, claimId, commitmentLevel),
    onSuccess: (claim: ResourceClaim) => {
      // Update the specific claim in cache
      queryClient.setQueryData(resourceClaimsKeys.detail(claim.id), claim);

      // Invalidate related queries to refresh lists
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByClaimant(claim.claimantId),
      });
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByResource(claim.resourceId),
      });

      // Note: Commitment level changes don't affect trust scores, 
      // so we don't need to invalidate trust score queries
    },
  });
}