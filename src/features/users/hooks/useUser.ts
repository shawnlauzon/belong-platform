import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchUserById } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { PublicUser } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { userKeys } from '../queries';

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
 *       {user.bio && <p>Bio: {user.bio}</p>}
 *       {user.avatarUrl && (
 *         <img
 *           src={user.avatarUrl}
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
  userId: string,
  options?: Partial<UseQueryOptions<PublicUser | null, Error>>,
): UseQueryResult<PublicUser | null, Error> {
  const supabase = useSupabase();

  const query = useQuery<PublicUser | null, Error>({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUserById(supabase, userId),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🔐 API: Error fetching user', {
      error: query.error,
    });
  }

  return query;
}
