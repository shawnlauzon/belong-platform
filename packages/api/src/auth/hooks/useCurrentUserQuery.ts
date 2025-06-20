import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getBelongClient } from '@belongnetwork/core';
import { User } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { useCurrentUserId } from './useCurrentUserId';


/**
 * A React Query hook for getting the currently authenticated user
 * Uses useUserQuery with the current user ID
 * @returns A React Query object with current user data
 */
export function useCurrentUserQuery() {
  const queryClient = useQueryClient();
  const currentUserIdQuery = useCurrentUserId();

  // Set up auth state listener to invalidate cache on sign-out
  useEffect(() => {
    const { supabase } = getBelongClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Remove currentUser cache when user signs out
        queryClient.removeQueries({ queryKey: ['currentUser'] });
        queryClient.removeQueries({ queryKey: ['currentUserId'] });
        logger.info('🔐 API: Auth state changed to SIGNED_OUT, removed currentUser cache');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Use useQuery directly with the user ID
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (!currentUserIdQuery.data) {
        return null;
      }
      return fetchUserById(currentUserIdQuery.data);
    },
    enabled: !currentUserIdQuery.isPending, // Run query when currentUserId is not pending
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Invalid Refresh Token') || 
          error?.message?.includes('Auth session missing')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}