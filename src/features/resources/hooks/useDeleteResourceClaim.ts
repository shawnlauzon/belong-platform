import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceClaim } from '../api';
import { ResourceClaim } from '../types';
import { resourceClaimsKeys } from '../queries';

export function useDeleteResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceClaim | null, Error, string>({
    mutationFn: async (id: string) => {
      return deleteResourceClaim(supabase, id);
    },
    onSuccess: (claim) => {
      if (claim) {
        queryClient.removeQueries({
          queryKey: resourceClaimsKeys.detail(claim.id),
        });

        // TODO Invalidate only the queries which are affected; removing all
        // isn't a big deal however because we almost never remove a claim
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.all,
        });
      }
    },
  });
}
