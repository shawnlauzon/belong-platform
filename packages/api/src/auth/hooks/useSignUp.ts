import { useMutation } from '@tanstack/react-query';
import { signUp as signUpService } from '../services/auth.service';
import { Account } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';

/**
 * A React Query mutation hook for signing up a new user
 * Uses the new auth service but maintains backward compatibility
 * Note: Cache invalidation is now handled by the BelongProvider's centralized auth state listener
 * @returns A mutation object with the sign-up mutation and its status
 */
export function useSignUp() {
  return useMutation<Account, Error, { email: string; password: string; firstName: string; lastName: string }>({
    mutationFn: async ({ email, password, firstName, lastName }) => {
      return signUpService(email, password, firstName, lastName);
    },
    onSuccess: (account) => {
      logger.info('🔐 API: User signed up successfully', { userId: account.id });
      // Note: Cache invalidation is handled by BelongProvider's centralized auth state listener
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
  });
}
