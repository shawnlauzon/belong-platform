import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceClaims } from '../api';
import { ResourceClaim, ResourceClaimFilter } from '../types';
import { STANDARD_CACHE_TIME } from '@/config';
import { resourceClaimsKeys } from '../queries';

/**
 * Hook for fetching all claims for a specific resource.
 *
 * @param resourceId - The ID of the resource to fetch claims for
 * @param filter - Optional additional filters (excluding resourceId)
 * @returns Query state for resource claims
 *
 * @example
 * ```tsx
 * // Get all claims for a resource
 * const { data: claims } = useResourceClaimsByResource('resource-123');
 *
 * // Get only pending claims for a resource
 * const { data: pendingClaims } = useResourceClaimsByResource('resource-123', {
 *   status: 'pending'
 * });
 *
 * // Get claims by a specific user on this resource
 * const { data: userClaims } = useResourceClaimsByResource('resource-123', {
 *   userId: 'user-456'
 * });
 * ```
 */
export function useResourceClaims(
  filter?: ResourceClaimFilter,
  options?: UseQueryOptions<ResourceClaim[], Error>,
) {
  if (filter?.claimantId && filter?.resourceOwnerId) {
    throw new Error('Cannot filter by both claimantId and resourceOwnerId');
  }
  const supabase = useSupabase();

  return useQuery<ResourceClaim[], Error>({
    queryKey: filter?.claimantId
      ? resourceClaimsKeys.listByClaimant(filter.claimantId)
      : filter?.resourceOwnerId
        ? resourceClaimsKeys.listByResourceOwner(filter.resourceOwnerId)
        : resourceClaimsKeys.all,
    queryFn: () => fetchResourceClaims(supabase, filter),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });
}
