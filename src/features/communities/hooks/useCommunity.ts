import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { Community } from '@/features/communities/types';
import { fetchCommunityById } from '../api/fetchCommunityById';
import { STANDARD_CACHE_TIME } from '@/config';
import { communityKeys } from '../queries';

/**
 * Hook for fetching a single community by ID.
 *
 * Provides detailed community information including organizer data.
 *
 * @param id - The community ID to fetch
 * @returns Query state for the community
 *
 * @example
 * ```tsx
 * function CommunityDetail({ communityId }) {
 *   const { data: community, isPending, error } = useCommunity(communityId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!community) return <div>Community not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{community.name}</h1>
 *       <p>{community.description}</p>
 *       <div>
 *         <span>Organizer: {community.organizer.firstName} {community.organizer.lastName}</span>
 *         <span>Members: {community.memberCount}</span>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunity(
  id: string,
  options?: UseQueryOptions<Community | null, Error>,
) {
  const supabase = useSupabase();

  return useQuery<Community | null, Error>({
    queryKey: communityKeys.detail(id),
    queryFn: () => fetchCommunityById(supabase, id),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });
}
