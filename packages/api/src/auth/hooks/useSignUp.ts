import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signUp } from '../impl/signUp';
import { Account } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';

type SignUpData = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

/**
 * A React Query mutation hook for signing up a new user
 * @returns A mutation object with the sign-up mutation and its status
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, SignUpData>({
    mutationFn: async ({ email, password, firstName, lastName }) => {
      return signUp(email, password, { firstName, lastName });
    },
    onSuccess: (data) => {
      // Invalidate any queries that depend on the current user
      queryClient.setQueryData(['currentUser'], data);
      logger.info('🔐 API: User signed up successfully', { userId: data.id });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
  });
}
