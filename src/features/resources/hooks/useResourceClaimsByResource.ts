import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceClaims, ResourceClaimFilter } from '../api';
import { ResourceClaim } from '../types';

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
export function useResourceClaimsByResource(
  resourceId: string,
  filter?: Omit<ResourceClaimFilter, 'resourceId'>
) {
  const supabase = useSupabase();

  return useQuery<ResourceClaim[], Error>({
    queryKey: ['resource-claims', 'by-resource', resourceId, filter] as const,
    queryFn: () => fetchResourceClaims(supabase, { ...filter, resourceId }),
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}