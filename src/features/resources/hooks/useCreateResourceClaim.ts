import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase, queryKeys } from '@/shared';
import { createResourceClaim } from '../api';
import { ResourceClaim, ResourceClaimInput } from '../types';

export function useCreateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim, Error, ResourceClaimInput>({
    mutationFn: (claimInput: ResourceClaimInput) =>
      createResourceClaim(supabase, claimInput),
    onSuccess: (claim) => {
      // Invalidate all resource claims - ensures any cached lists are refreshed
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceClaims.all,
      });
      
      // Invalidate specific queries for this resource
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceClaims.byResource(claim.resourceId),
      });
      
      // Invalidate specific queries for this claimant
      queryClient.invalidateQueries({
        queryKey: queryKeys.resourceClaims.byClaimant(claim.userId),
      });
      
      // Invalidate filtered queries that might include this claim
      queryClient.invalidateQueries({
        queryKey: ['resource-claims', 'filtered'],
      });
    },
  });
}