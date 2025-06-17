import { useQuery } from '@tanstack/react-query';
import { User } from '@belongnetwork/types';
import { getCurrentUser } from '../impl/getCurrentUser';
import { useBelongClient } from '../../context/BelongClientProvider';

/**
 * A React Query hook for getting the currently authenticated user
 * @returns A query object with the current user data and status
 */
export function useCurrentUser() {
  const client = useBelongClient();
  
  return useQuery<User | null, Error>({
    queryKey: ['currentUser'],
    queryFn: () => getCurrentUser(client),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
