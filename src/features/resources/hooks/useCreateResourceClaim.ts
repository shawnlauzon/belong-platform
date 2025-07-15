import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createResourceClaim } from '../api';
import { ResourceClaim, ResourceClaimInput } from '../types';

export function useCreateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim, Error, ResourceClaimInput>({
    mutationFn: (claimInput: ResourceClaimInput) =>
      createResourceClaim(supabase, claimInput),
    onSuccess: (claim) => {
      // Invalidate the claims query for this resource
      queryClient.invalidateQueries({
        queryKey: ['resource-claims', claim.resourceId],
      });
    },
  });
}