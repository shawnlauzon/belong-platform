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
      try {
        logger.debug('🔐 useSignUp: Starting mutation', { email });
        const result = await signUp(email, password, { firstName, lastName });
        logger.debug('🔐 useSignUp: Mutation completed successfully', { userId: result.id });
        return result;
      } catch (error) {
        logger.error('🔐 useSignUp: Mutation failed', { error, email });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate any queries that depend on the current user
      queryClient.setQueryData(['currentUser'], data);
      logger.info('🔐 API: User signed up successfully', { userId: data.id });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
    onSettled: (data, error) => {
      logger.debug('🔐 useSignUp: Mutation settled', { 
        success: !!data, 
        hasError: !!error,
        errorMessage: error?.message 
      });
    },
  });
}
