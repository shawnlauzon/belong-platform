import { useQuery } from '@tanstack/react-query';
import { User } from '../../users/types';
import { STANDARD_CACHE_TIME } from '../../../config';
import { createAuthService } from '../services/auth.service';
import { useSupabase } from '../../../shared';
import { logger } from '../../../shared';

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
 *   const { data: currentUser, isLoading, error } = useCurrentUser();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!currentUser) return <div>Not authenticated</div>;
 *   
 *   return <div>Welcome, {currentUser.firstName}!</div>;
 * }
 * ```
 */
export function useCurrentUser() {
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  const query = useQuery({
    queryKey: ['auth'],
    queryFn: authService.getCurrentUser,
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

  if (query.error) {
    logger.error('🔐 API: Error fetching current user', {
      error: query.error,
    });
  }

  return query;
}