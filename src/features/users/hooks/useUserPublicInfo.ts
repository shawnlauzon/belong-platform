import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchUserPublicInfo } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { UserPublicInfo } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { userKeys } from '../queries';

/**
 * Hook for fetching public user information by member connection code.
 *
 * This hook provides functionality for retrieving public user information
 * (id, firstName, avatarUrl) without requiring authentication. This is useful
 * for displaying basic user info in public contexts via member connection codes.
 *
 * @param memberConnectionCode - The connection code of the user to fetch public info for
 * @returns React Query result with public user data and query state
 *
 * @example
 * ```tsx
 * function UserCard({ memberConnectionCode }: { memberConnectionCode: string }) {
 *   const { data: user, isPending, isError } = useUserPublicInfo(memberConnectionCode);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (isError) return <div>Error loading user</div>;
 *   if (!user) return <div>User not found</div>;
 *
 *   return (
 *     <div>
 *       <h3>{user.firstName}</h3>
 *       {user.avatarUrl && (
 *         <img src={user.avatarUrl} alt={`${user.firstName}'s avatar`} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using in a comment component to show author info
 * function CommentAuthor({ memberConnectionCode }: { memberConnectionCode: string }) {
 *   const { data: author } = useUserPublicInfo(memberConnectionCode);
 *
 *   return (
 *     <div className="comment-author">
 *       {author?.avatarUrl && (
 *         <img src={author.avatarUrl} alt="" className="avatar" />
 *       )}
 *       <span>{author?.firstName || 'Unknown'}</span>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUserPublicInfo(
  memberConnectionCode: string,
  options?: Partial<UseQueryOptions<UserPublicInfo | null, Error>>,
): UseQueryResult<UserPublicInfo | null, Error> {
  const supabase = useSupabase();

  const query = useQuery<UserPublicInfo | null, Error>({
    queryKey: userKeys.publicDetail(memberConnectionCode),
    queryFn: () => fetchUserPublicInfo(supabase, memberConnectionCode),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🔐 API: Error fetching user public info', {
      error: query.error,
      memberConnectionCode,
    });
  }

  return query;
}