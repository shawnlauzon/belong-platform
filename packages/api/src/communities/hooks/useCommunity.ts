import { useQuery } from '@tanstack/react-query';
import { fetchCommunityById } from '../impl/fetchCommunityById';

export function useCommunity(id: string, options?: { includeDeleted?: boolean }) {
  return useQuery({
    queryKey: ['communities', id, options],
    queryFn: () => fetchCommunityById(id, options),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
