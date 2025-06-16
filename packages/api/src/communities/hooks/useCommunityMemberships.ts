import { useQuery } from '@tanstack/react-query';
import { fetchCommunityMemberships } from '../impl/fetchCommunityMemberships';
import { logger } from '@belongnetwork/core';

export function useCommunityMemberships(communityId: string) {
  const result = useQuery({
    queryKey: ['community-memberships', communityId],
    queryFn: () => fetchCommunityMemberships(communityId),
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log errors if they occur
  if (result.error) {
    logger.error('🏘️ API: Failed to fetch community memberships via hook', { 
      error: result.error, 
      communityId 
    });
  }

  return result;
}