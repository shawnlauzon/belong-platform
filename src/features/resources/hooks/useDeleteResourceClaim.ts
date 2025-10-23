import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { deleteResourceClaim } from '../api';
import { resourceClaimsKeys, resourceKeys } from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';
import { ResourceClaim } from '../types';

/**
 * Hook for deleting a resource claim.
 *
 * Provides a mutation function for deleting claims/registrations.
 * Automatically invalidates related queries on successful deletion.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function CancelClaimButton({ claimId }) {
 *   const { mutate: deleteClaim, isPending, error } = useDeleteResourceClaim();
 *
 *   const handleCancel = () => {
 *     if (!confirm('Are you sure you want to cancel this claim?')) {
 *       return;
 *     }
 *
 *     deleteClaim(claimId, {
 *       onSuccess: () => {
 *         // Handle successful cancellation
 *       },
 *       onError: (error) => {
 *         console.error('Failed to cancel claim:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleCancel}
 *       disabled={isPending}
 *     >
 *       {isPending ? 'Cancelling...' : 'Cancel Claim'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteResourceClaim() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation<ResourceClaim | null, Error, string>({
    mutationFn: (id: string) => deleteResourceClaim(supabase, id),
    onSuccess: (claim: ResourceClaim | null) => {
      if (claim) {
        // Remove the specific claim from cache
        queryClient.removeQueries({
          queryKey: resourceClaimsKeys.detail(claim.id),
        });

        // Invalidate claim lists
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.listByClaimant(claim.claimantId),
        });
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.listByResource(claim.resourceId),
        });
        queryClient.invalidateQueries({
          queryKey: resourceClaimsKeys.listByResourceOwner(claim.resourceOwnerId),
        });

        // Invalidate resource detail (may include claim counts)
        queryClient.invalidateQueries({
          queryKey: resourceKeys.detail(claim.resourceId),
        });

        // Invalidate trust score for claimant (claim deletion may affect scores)
        queryClient.invalidateQueries({
          queryKey: trustScoreKeys.listByUser(claim.claimantId),
        });

        logger.info('🏘️ API: Successfully deleted resource claim', {
          id: claim.id,
        });
      }
    },
    onError: (error: Error) => {
      logger.error('🏘️ API: Failed to delete resource claim', { error });
    },
  });

  return mutation;
}
