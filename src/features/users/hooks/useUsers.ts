import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createUserService } from '../services/user.service';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { User, UserFilter } from '../types';
import { toRecords } from '../../../shared';

/**
 * Hook for fetching a list of users with optional filtering.
 *
 * This hook provides functionality for retrieving users with support for searching,
 * pagination, and filtering. The query is enabled by default and supports various
 * filter options for finding specific users. Must be used within a BelongProvider context.
 *
 * @param filters - Optional filters to apply to the users query
 * @returns React Query result with user data and query state
 *
 * @example
 * ```tsx
 * function UserDirectory() {
 *   // Load all users
 *   const { data: allUsers, isPending, isError } = useUsers();
 *
 *   // Search for users by name or email
 *   const { data: searchResults } = useUsers({ searchTerm: 'john' });
 *
 *   // Load users with pagination
 *   const { data: paginatedUsers } = useUsers({ page: 1, pageSize: 20 });
 *
 *   if (isPending) return <div>Loading users...</div>;
 *   if (isError) return <div>Error loading users</div>;
 *
 *   return (
 *     <div>
 *       {allUsers?.map(user => (
 *         <div key={user.id}>
 *           <h3>{user.firstName} {user.lastName}</h3>
 *           <p>{user.email}</p>
 *           {user.bio && <p>{user.bio}</p>}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUsers(filters?: UserFilter) {
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  const query = useQuery<User[], Error>({
    queryKey: filters
      ? queryKeys.users.filtered(toRecords(filters))
      : queryKeys.users.all,
    queryFn: () => {
      logger.debug('👤 useUsers: Fetching users', { filters });
      return userService.fetchUsers(filters);
    },
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('👥 API: Error fetching users', {
      error: query.error,
    });
  }

  return query.data ?? [];
}
