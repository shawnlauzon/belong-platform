import { useQuery } from '@tanstack/react-query';
import type { CommunityInfo } from '@belongnetwork/types';
import { useClient } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';

export function useCommunities(options?: { includeDeleted?: boolean }) {
  const client = useClient();
  const communityService = createCommunityService(client);
  
  return useQuery<CommunityInfo[], Error>({
    queryKey: ['communities', options],
    queryFn: () => communityService.fetchCommunities(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
