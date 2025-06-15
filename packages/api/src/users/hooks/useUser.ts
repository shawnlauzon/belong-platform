import { useQuery } from '@tanstack/react-query';
import { fetchUserById } from '../impl/fetchUserById';

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => {
      if (!userId) return null;
      return fetchUserById(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
