import { useQuery } from '@tanstack/react-query';
import { queryKeys, toRecords, useSupabase } from '@/shared';
import { fetchResourceClaims } from '../api';
import { ResourceClaim, ResourceClaimFilter } from '../types';

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
export function useResourceClaims(filter?: ResourceClaimFilter) {
  const supabase = useSupabase();

  return useQuery<ResourceClaim[], Error>({
    queryKey: queryKeys.resourceClaims.filtered(toRecords(filter)),
    queryFn: () => fetchResourceClaims(supabase, filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
