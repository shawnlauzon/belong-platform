import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createCommunityService } from '../services/community.service';
import { STANDARD_CACHE_TIME } from '../../../config';

import type { CommunityMembership } from '../types/domain';

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
 *           <h3>{membership.community.name}</h3>
 *           <p>Role: {membership.role}</p>
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
 *         <CommunityCard key={membership.communityId} membership={membership} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserCommunities(userId?: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  const query = useQuery<CommunityMembership[], Error>({
    queryKey: queryKeys.communities.userMemberships(userId!),
    queryFn: () => communityService.fetchUserMemberships(userId!),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!userId,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching user communities', {
      error: query.error,
      userId,
    });
  }

  return query;
}