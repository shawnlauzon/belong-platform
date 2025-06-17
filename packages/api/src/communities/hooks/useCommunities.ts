import { useQuery } from '@tanstack/react-query';
import { fetchCommunities } from '../impl/fetchCommunities';
import { useBelongClient } from '../../context/BelongClientProvider';

export function useCommunities() {
  const client = useBelongClient();
  
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => fetchCommunities(client),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
