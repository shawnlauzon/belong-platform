import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';
import { logger } from '@belongnetwork/core';

export function useUserMemberships(userId?: string) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  const result = useQuery({
    queryKey: ['user-memberships', userId],
    queryFn: () => communityService.fetchUserMemberships(userId),
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