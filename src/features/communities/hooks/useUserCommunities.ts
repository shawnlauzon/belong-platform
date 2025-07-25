import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchUserCommunities } from '@/features/communities/api';
import { STANDARD_CACHE_TIME } from '@/config';

import type { CommunityMembership } from '@/features/communities/types';
import { userCommunitiesKeys } from '../queries';

/**
 * Hook for fetching communities a user is a member of.
 *
 * Provides a list of all communities where the specified user is a member.
 *
 * @param userId - The user ID to fetch communities for
 * @returns Query state for user's communities
 *
 * @example
 * ```tsx
 * function UserCommunities({ userId }) {
 *   const { data: memberships, isLoading, error } = useUserCommunities(userId);
 *
 *   if (isLoading) return <div>Loading communities...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h2>My Communities ({memberships?.length || 0})</h2>
 *       {memberships?.map(membership => (
 *         <div key={membership.communityId}>
 *           <h3>Community ID: {membership.communityId}</h3>
 *           <p>Joined: {new Date(membership.joinedAt).toLocaleDateString()}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Use with current user
 * function MyCommunities() {
 *   const { data: currentUser } = useCurrentUser();
 *   const { data: memberships } = useUserCommunities(currentUser?.id);
 *
 *   return (
 *     <div>
 *       {memberships?.map(membership => (
 *         <div key={membership.communityId}>
 *           <span>Community: {membership.communityId}</span>
 *           <span>Joined: {membership.joinedAt.toLocaleDateString()}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserCommunities(
  userId?: string,
  options?: Partial<UseQueryOptions<CommunityMembership[], Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery<CommunityMembership[], Error>({
    queryKey: userCommunitiesKeys.list(userId!),
    queryFn: () => fetchUserCommunities(supabase, userId!),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching user communities', {
      error: query.error,
      userId,
    });
  }

  return query;
}
