import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut } from '../impl/signOut';
import { logger } from '@belongnetwork/core';

/**
 * A React Query mutation hook for signing out the current user
 * @returns A mutation object with the sign-out mutation and its status
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      return signOut();
    },
    onSuccess: () => {
      // Remove the current user from the cache
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      logger.info('🔐 API: User signed out successfully');
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });
}
