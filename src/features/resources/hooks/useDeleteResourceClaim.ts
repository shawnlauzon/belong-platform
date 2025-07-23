import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase, queryKeys } from '@/shared';
import { deleteResourceClaim, fetchResourceClaimById } from '../api';
import { ResourceClaim } from '../types';

export function useDeleteResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim, Error, string>({
    mutationFn: async (id: string) => {
      // Fetch the claim first to get resourceId and userId for cache invalidation
      const claim = await fetchResourceClaimById(supabase, id);
      if (!claim) {
        throw new Error(`Claim with id ${id} not found`);
      }
      
      await deleteResourceClaim(supabase, id);
      return claim;
    },
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