import { useMutation } from '@tanstack/react-query';
import { signOut as signOutService } from '../services/auth.service';
import { logger } from '@belongnetwork/core';

/**
 * A React Query mutation hook for signing out the current user
 * Uses the new auth service but maintains backward compatibility
 * Note: Cache invalidation is now handled by the BelongProvider's centralized auth state listener
 * @returns A mutation object with the sign-out mutation and its status
 */
export function useSignOut() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      return signOutService();
    },
    onSuccess: () => {
      logger.info('🔐 API: User signed out successfully');
      // Note: Cache invalidation is handled by BelongProvider's centralized auth state listener
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });
}
