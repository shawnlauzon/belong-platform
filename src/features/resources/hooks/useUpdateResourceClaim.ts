import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateResourceClaim } from '../api';
import { ResourceClaim, ResourceClaimInput } from '../types';

export function useUpdateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    ResourceClaim,
    Error,
    { id: string; update: Partial<ResourceClaimInput> }
  >({
    mutationFn: ({ id, update }) =>
      updateResourceClaim(supabase, id, update),
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