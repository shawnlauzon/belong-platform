import { useQuery } from '@tanstack/react-query';
import { AuthUser } from '@belongnetwork/types';
import { useUser } from '../../users/hooks/useUser';

/**
 * A React Query hook for getting the currently authenticated user
 * @returns A query object with the current user data and status
 */
export function useCurrentUser() {
  return useQuery<AuthUser | null, Error>({
    queryKey: ['currentUser'],
    queryFn: tCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
