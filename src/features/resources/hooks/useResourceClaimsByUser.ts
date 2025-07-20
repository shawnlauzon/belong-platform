import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceClaims, ResourceClaimFilter } from '../api';
import { ResourceClaim } from '../types';

/**
 * Hook for fetching all claims made by a specific user.
 * 
 * @param userId - The ID of the user to fetch claims for
 * @param filter - Optional additional filters (excluding userId)
 * @returns Query state for user's resource claims
 * 
 * @example
 * ```tsx
 * // Get all claims by a user
 * const { data: claims } = useResourceClaimsByUser('user-456');
 * 
 * // Get only approved claims by a user
 * const { data: approvedClaims } = useResourceClaimsByUser('user-456', { 
 *   status: 'approved' 
 * });
 * 
 * // Get user's claims on resources owned by someone specific
 * const { data: ownerClaims } = useResourceClaimsByUser('user-456', { 
 *   resourceOwnerId: 'owner-789' 
 * });
 * ```
 */
export function useResourceClaimsByUser(
  userId: string,
  filter?: Omit<ResourceClaimFilter, 'userId'>
) {
  const supabase = useSupabase();

  return useQuery<ResourceClaim[], Error>({
    queryKey: ['resource-claims', 'by-user', userId, filter] as const,
    queryFn: () => fetchResourceClaims(supabase, { ...filter, userId }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}