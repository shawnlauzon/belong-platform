import { useQuery, QueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchCommunityMemberships } from '@/features/communities/api';
import { STANDARD_CACHE_TIME } from '@/config';

import type { CommunityMembership } from '@/features/communities/types';
import { communityMembersKeys } from '../queries';

/**
 * Hook for fetching community members.
 *
 * Provides a list of all members in a specific community.
 *
 * @param communityId - The community ID to fetch members for
 * @returns Query state for community members
 *
 * @example
 * ```tsx
 * function CommunityMembersList({ communityId }) {
 *   const { data: members, isPending, error } = useCommunityMembers(communityId);
 *
 *   if (isPending) return <div>Loading members...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Community Members ({members?.length || 0})</h2>
 *       {members?.map(member => (
 *         <div key={member.userId}>
 *           <span>User ID: {member.userId}</span>
 *           <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunityMembers(
  communityId: string,
  options?: Partial<QueryOptions<CommunityMembership[], Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery<CommunityMembership[], Error>({
    queryKey: communityMembersKeys.list(communityId),
    queryFn: () => fetchCommunityMemberships(supabase, communityId),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching community members', {
      error: query.error,
      communityId,
    });
  }

  return query;
}
