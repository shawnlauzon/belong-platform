import { useQuery } from '@tanstack/react-query';
import { fetchCommunityById } from '../impl/fetchCommunityById';

export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['communities', id],
    queryFn: () => fetchCommunityById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
