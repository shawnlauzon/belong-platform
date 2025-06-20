import { useQuery } from '@tanstack/react-query';
import { fetchUserById } from '../impl/fetchUserById';
import { queryKeys } from '../../shared/queryKeys';

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.byId(id),
    queryFn: () => fetchUserById(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
