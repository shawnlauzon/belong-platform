import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn } from '../impl/signIn';
import { Account } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';

/**
 * A React Query mutation hook for signing in a user
 * @returns A mutation object with the sign-in mutation and its status
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      return signIn(email, password);
    },
    onSuccess: (data) => {
      // Invalidate any queries that depend on the current user
      queryClient.setQueryData(['currentUser'], data);
      logger.info('🔐 API: User signed in successfully', { userId: data.id });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign in', { error });
    },
  });
}
