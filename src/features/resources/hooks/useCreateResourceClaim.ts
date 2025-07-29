import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createResourceClaim } from '../api';
import { Resource, ResourceClaim, ResourceClaimInput } from '../types';
import { resourceClaimsKeys, resourceKeys } from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

export function useCreateResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim, Error, ResourceClaimInput>({
    mutationFn: (claimInput: ResourceClaimInput) =>
      createResourceClaim(supabase, claimInput),
    onSuccess: (claim) => {
      queryClient.setQueryData(resourceClaimsKeys.detail(claim.id), claim);
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByResource(claim.resourceId),
      });
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByClaimant(claim.claimantId),
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

      // Invalidate trust score for claimant (creating claims affects scores)
      if (resource) {
        resource.communityIds.forEach((communityId) => {
          queryClient.invalidateQueries({
            queryKey: trustScoreKeys.detail({ 
              userId: claim.claimantId, 
              communityId 
            }),
          });
        });
      }
    },
  });
}
