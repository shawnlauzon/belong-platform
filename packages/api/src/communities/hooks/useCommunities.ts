import { useQuery } from '@tanstack/react-query';
import { fetchCommunities } from '../impl/fetchCommunities';

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: fetchCommunities,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
