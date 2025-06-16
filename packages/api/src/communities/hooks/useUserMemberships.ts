import { useQuery } from '@tanstack/react-query';
import { fetchUserMemberships } from '../impl/fetchUserMemberships';
import { logger } from '@belongnetwork/core';

export function useUserMemberships(userId?: string) {
  const result = useQuery({
    queryKey: ['user-memberships', userId],
    queryFn: () => fetchUserMemberships(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log errors if they occur
  if (result.error) {
    logger.error('🏘️ API: Failed to fetch user memberships via hook', { 
      error: result.error, 
      userId 
    });
  }

  return result;
}