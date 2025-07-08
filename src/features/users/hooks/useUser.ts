import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchUserById } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { UserDetail } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Hook for fetching a single user by ID.
 *
 * This hook provides functionality for retrieving a complete user profile
 * including all user information and settings. The query is enabled when a valid
 * userId is provided. Must be used within a BelongProvider context.
 *
 * @param userId - The ID of the user to fetch
 * @returns React Query result with user data and query state
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data: user, isPending, isError } = useUser(userId);
 *
 *   if (isPending) return <div>Loading user...</div>;
 *   if (isError) return <div>Error loading user</div>;
 *   if (!user) return <div>User not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{user.firstName} {user.lastName}</h1>
 *       <p>Email: {user.email}</p>
 *       {user.bio && <p>Bio: {user.bio}</p>}
 *       {user.profilePictureUrl && (
 *         <img
 *           src={user.profilePictureUrl}
 *           alt={`${user.firstName}'s profile`}
 *         />
 *       )}
 *       <p>Member since: {user.createdAt.toLocaleDateString()}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using in a user settings form
 * function UserSettingsForm({ userId }: { userId: string }) {
 *   const { data: user, isPending } = useUser(userId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (!user) return <div>User not found</div>;
 *
 *   return (
 *     <form>
 *       <input defaultValue={user.firstName} name="firstName" />
 *       <input defaultValue={user.lastName} name="lastName" />
 *       <textarea defaultValue={user.bio || ''} name="bio" />
 *     </form>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUser(
  userId: string | null,
): UseQueryResult<UserDetail | null, Error> {
  const supabase = useSupabase();

  const query = useQuery<UserDetail | null, Error>({
    queryKey: queryKeys.users.byId(userId),
    queryFn: () => {
      logger.debug('👤 useUser: Fetching user by ID', { userId });
      return userId ? fetchUserById(supabase, userId) : null;
    },
    staleTime: STANDARD_CACHE_TIME,
    enabled: Boolean(userId?.trim()),
  });

  if (query.error) {
    logger.error('🔐 API: Error fetching user', {
      error: query.error,
    });
  }

  return query;
}
