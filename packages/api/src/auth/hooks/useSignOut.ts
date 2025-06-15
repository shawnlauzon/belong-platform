import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut } from '../impl/signOut';

/**
 * A React Query mutation hook for signing out the current user
 * @returns A mutation object with the sign-out mutation and its status
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation<void, Error>(
    async () => {
      return signOut();
    },
    {
      onSuccess: () => {
        // Remove the current user from the cache
        queryClient.setQueryData(['currentUser'], null);
        // Invalidate any queries that depend on the current user
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      },
    }
  );
}
