import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createCommunityService } from '../services/community.service';
import { STANDARD_CACHE_TIME } from '../../../config';

import type { Community } from '../types/domain';

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
export function useCommunity(id: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  const query = useQuery<Community | null, Error>({
    queryKey: queryKeys.communities.byId(id),
    queryFn: () => communityService.fetchCommunityById(id),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!id,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching community', {
      error: query.error,
      communityId: id,
    });
  }

  return query;
}
