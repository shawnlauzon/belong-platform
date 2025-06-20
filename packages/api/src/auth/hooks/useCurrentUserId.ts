import { useQuery } from '@tanstack/react-query';
import { getBelongClient } from '@belongnetwork/core';

/**
 * Fetches the current user's ID from Supabase auth
 */
async function fetchCurrentUserId(): Promise<string | null> {
  const { supabase, logger } = getBelongClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.debug('🔐 API: Failed to get authenticated user ID', { error });
      return null;
    }
    
    if (!user) {
      logger.debug('🔐 API: No authenticated user found for ID lookup');
      return null;
    }
    
    return user.id;
  } catch (error) {
    logger.error('🔐 API: Error fetching current user ID', { error });
    return null;
  }
}

/**
 * Hook to get the current user's ID
 * @returns The current user's ID as a string, or null if not authenticated
 */
export function useCurrentUserId() {
  return useQuery({
    queryKey: ['currentUserId'],
    queryFn: fetchCurrentUserId,
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