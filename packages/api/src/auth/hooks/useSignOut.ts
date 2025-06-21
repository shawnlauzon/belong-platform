import { useMutation } from '@tanstack/react-query';
import { createAuthService } from '../services/auth.service';
import { useOptionalClient } from '../providers/CurrentUserProvider';

/**
 * A React Query mutation hook for signing out the current user
 * Works inside BelongProvider context for automatic cache management
 * @returns A mutation object with the sign-out mutation and its status
 */
export function useSignOut() {
  const client = useOptionalClient();
  
  if (!client) {
    throw new Error(
      'useSignOut must be used within BelongProvider. ' +
      'Wrap your component with BelongProvider and provide configuration:\n\n' +
      '<BelongProvider config={{supabaseUrl, supabaseAnonKey, mapboxPublicToken}}>\n' +
      '  <YourComponent />\n' +
      '</BelongProvider>'
    );
  }
  
  const authService = createAuthService(client);

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      return authService.signOut();
    },
    onSuccess: () => {
      client.logger.info('🔐 API: User signed out successfully');
      // Note: Cache invalidation is handled by BelongProvider's centralized auth state listener
    },
    onError: (error) => {
      client.logger.error('🔐 API: Failed to sign out', { error });
    },
  });
}
