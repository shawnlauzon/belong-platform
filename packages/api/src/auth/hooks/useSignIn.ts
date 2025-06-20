import { useMutation } from '@tanstack/react-query';
import { signIn as signInService } from '../services/auth.service';
import { Account } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';

/**
 * A React Query mutation hook for signing in a user
 * Uses the new auth service but maintains backward compatibility
 * Note: Cache invalidation is now handled by the BelongProvider's centralized auth state listener
 * @returns A mutation object with the sign-in mutation and its status
 */
export function useSignIn() {
  return useMutation<Account, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      return signInService(email, password);
    },
    onSuccess: (account) => {
      logger.info('🔐 API: User signed in successfully', { userId: account.id });
      // Note: Cache invalidation is handled by BelongProvider's centralized auth state listener
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign in', { error });
    },
  });
}
