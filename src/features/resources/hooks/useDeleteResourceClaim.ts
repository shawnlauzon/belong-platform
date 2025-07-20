import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
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
      // Invalidate all queries for this resource (regardless of additional filters)
      queryClient.invalidateQueries({
        queryKey: ['resource-claims', 'by-resource', claim.resourceId],
      });
      
      // Invalidate all queries for this user (regardless of additional filters)
      queryClient.invalidateQueries({
        queryKey: ['resource-claims', 'by-user', claim.userId],
      });
    },
  });
}