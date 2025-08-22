import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceClaim } from '../api';
import { Resource, ResourceClaimSummary } from '../types';
import { resourceClaimsKeys, resourceKeys } from '../queries';

export function useDeleteResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaimSummary | null, Error, string>({
    mutationFn: async (id: string) => {
      return deleteResourceClaim(supabase, id);
    },
    onSuccess: (claim: ResourceClaimSummary | null) => {
      if (claim) {
        queryClient.removeQueries({
          queryKey: resourceClaimsKeys.detail(claim.id),
        });

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
      }
    },
  });
}
