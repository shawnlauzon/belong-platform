import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { STANDARD_CACHE_TIME } from '@/config';
import { getCurrentUserId } from '../api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';
import type { User } from '@/features/users/types';
import { authKeys } from '../queries';
import { fetchUserById } from '@/features/users/api';
import { userKeys } from '@/features/users/queries';

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

  // First query: Get current user ID
  const userIdQuery = useQuery({
    queryKey: authKeys.currentUserId(),
    queryFn: () => getCurrentUserId(supabase),
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
  });

  const userId = userIdQuery.data;

  // Second query: Get user data if ID exists
  const userQuery = useQuery({
    queryKey: userKeys.detail(userId || ''),
    queryFn: () => fetchUserById(supabase, userId!),
    enabled: !!userId,
    staleTime: STANDARD_CACHE_TIME,
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

  // Handle errors from either query
  const error = userIdQuery.error || userQuery.error;
  if (error) {
    logger.error('🔐 API: Error fetching current user', { error });
  }

  // Return combined state
  return {
    data: userId ? userQuery.data || null : null,
    error,
    isPending: userIdQuery.isPending || (userId ? userQuery.isPending : false),
    isLoading: userIdQuery.isLoading || (userId ? userQuery.isLoading : false),
    isFetching: userIdQuery.isFetching || (userId ? userQuery.isFetching : false),
    isError: userIdQuery.isError || userQuery.isError,
    isSuccess: userIdQuery.isSuccess && (!userId || userQuery.isSuccess),
    status: userIdQuery.isError || userQuery.isError 
      ? 'error' as const
      : (userIdQuery.isPending || (userId ? userQuery.isPending : false))
        ? 'pending' as const 
        : 'success' as const,
    fetchStatus: userIdQuery.isFetching || (userId ? userQuery.isFetching : false) 
      ? 'fetching' as const 
      : 'idle' as const,
  };
}
