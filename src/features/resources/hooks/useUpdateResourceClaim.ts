import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateResourceClaim } from '../api';
import { Resource, ResourceClaim, ResourceClaimInput } from '../types';
import { resourceClaimsKeys, resourceKeys } from '../queries';

export function useUpdateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    ResourceClaim,
    Error,
    Pick<ResourceClaimInput, 'status' | 'notes'> & { id: string }
  >({
    mutationFn: (update) => updateResourceClaim(supabase, update),
    onSuccess: (claim) => {
      queryClient.setQueryData(resourceClaimsKeys.detail(claim.id), claim);

      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByClaimant(claim.claimantId),
      });
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByResource(claim.resourceId),
      });

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
    },
  });
}
