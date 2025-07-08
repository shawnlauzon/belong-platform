import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import type { CommunityDetail } from '@/features/communities/types';
import { fetchAndCacheCommunity } from '../api/fetchAndCacheCommunity';

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
export function useCommunity(id: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useQuery<CommunityDetail | null, Error>({
    queryKey: queryKeys.communities.byId(id),
    queryFn: () => fetchAndCacheCommunity(supabase, queryClient, id),
    enabled: !!id,
  });
}
