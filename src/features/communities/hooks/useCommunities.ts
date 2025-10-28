import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { fetchCommunities } from '@/features/communities/api';
import { STANDARD_CACHE_TIME } from '@/config';
import { communityKeys } from '../queries';

import type { Community, CommunityFilter } from '@/features/communities/types';

/**
 * Hook for fetching communities list.
 *
 * Provides community listing functionality with optional filtering.
 * Use separate mutation hooks for create/update/delete operations.
 *
 * @param filters - Optional filters to apply to the community list
 * @returns Query state for communities list
 *
 * @example
 * ```tsx
 * function CommunityList() {
 *   const { data: communities, isPending, error } = useCommunities();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {communities?.map(community => (
 *         <div key={community.id}>{community.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With filters
 * function ActiveCommunities() {
 *   const { data: communities } = useCommunities({
 *     isActive: true,
 *     category: 'social'
 *   });
 *
 *   return (
 *     <div>
 *       {communities?.map(community => (
 *         <div key={community.id}>{community.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunities(
  filter?: CommunityFilter,
  options?: Partial<UseQueryOptions<Community[], Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery<Community[], Error>({
    queryKey: filter ? communityKeys.list(filter) : communityKeys.lists(),
    queryFn: () => fetchCommunities(supabase, filter),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching communities', {
      error: query.error,
      filter,
    });
  }

  return query;
}
