import { useQuery } from '@tanstack/react-query';
import { fetchUserById } from '../impl/fetchUserById';

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUserById(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
