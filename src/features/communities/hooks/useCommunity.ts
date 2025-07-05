import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { useUser } from '@/features/users';
import { STANDARD_CACHE_TIME } from '@/config';

import type { Community } from '@/features/communities/types';
import { fetchCommunityById } from '../api';

/**
 * Hook for fetching a single community by ID.
 *
 * Provides detailed community information including membership data.
 *
 * @param id - The community ID to fetch
 * @returns Query state for the community
 *
 * @example
 * ```tsx
 * function CommunityDetail({ communityId }) {
 *   const { data: community, isLoading, error } = useCommunity(communityId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!community) return <div>Community not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{community.name}</h1>
 *       <p>{community.description}</p>
 *       <p>Members: {community.memberCount}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunity(id: string): Community | null {
  const supabase = useSupabase();

  // Fetch community info
  const {
    data: communityInfo,
    error: communityError,
    isLoading: isCommunityLoading,
  } = useQuery({
    queryKey: queryKeys.communities.byId(id),
    queryFn: () => fetchCommunityById(supabase, id),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!id,
  });

  // Fetch organizer details; will be null if no community found
  const organizer = useUser(communityInfo?.organizerId ?? null);

  // Handle errors
  if (communityError) {
    logger.error('🏘️ API: Error fetching community', {
      error: communityError,
      communityId: id,
    });
  }

  // Return null if community doesn't exist or required data is missing
  if (!communityInfo || !organizer || isCommunityLoading) {
    return null;
  }

  // Compose full Community object
  const community: Community = {
    ...communityInfo,
    organizer,
  };

  return community;
}
