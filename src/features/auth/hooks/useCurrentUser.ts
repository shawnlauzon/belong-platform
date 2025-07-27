import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { STANDARD_CACHE_TIME } from '@/config';
import { getCurrentUser } from '../api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';
import type { User } from '@/features/users/types';
import { authKeys } from '../queries';

/**
 * Hook for fetching the current authenticated user.
 *
 * Provides the current user's profile data including authentication state.
 * This hook combines auth session data with user profile information.
 *
 * @returns Query state for current user
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: currentUser, isPending, error } = useCurrentUser();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!currentUser) return <div>Not authenticated</div>;
 *
 *   return <div>Welcome, {currentUser.firstName}!</div>;
 * }
 * ```
 */
export function useCurrentUser(
  options?: Partial<UseQueryOptions<User | null, Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => getCurrentUser(supabase),
    staleTime: STANDARD_CACHE_TIME,
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (
        error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('Auth session missing')
      ) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });

  if (query.error) {
    logger.error('🔐 API: Error fetching current user', {
      error: query.error,
    });
  }

  return query;
}
