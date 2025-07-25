import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createResourceClaim } from '../api';
import { Resource, ResourceClaim, ResourceClaimInput } from '../types';
import { resourceClaimsKeys, resourceKeys } from '../queries';

export function useCreateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim, Error, ResourceClaimInput>({
    mutationFn: (claimInput: ResourceClaimInput) =>
      createResourceClaim(supabase, claimInput),
    onSuccess: (claim) => {
      queryClient.setQueryData(resourceClaimsKeys.detail(claim.id), claim);

      const resource = queryClient.getQueryData<Resource>(
        resourceKeys.detail(claim.resourceId),
      );
      if (resource) {
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.listByResourceOwner(resource.ownerId),
        });
      } else {
        // We don't know who the resource owner is, so invalidate all
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.listsByResourceOwner(),
        });
      }

      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByClaimant(claim.claimantId),
      });
    },
  });
}
