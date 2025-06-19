import { useQuery } from '@tanstack/react-query';
import type { CommunityInfo } from '@belongnetwork/types';
import { fetchCommunities } from '../impl/fetchCommunities';

export function useCommunities() {
  return useQuery<CommunityInfo[], Error>({
    queryKey: ['communities'],
    queryFn: () => fetchCommunities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
