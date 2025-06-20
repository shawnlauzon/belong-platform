import { useMutation } from '@tanstack/react-query';
import { createAuthService } from '../services/auth.service';
import { Account } from '@belongnetwork/types';
import { useOptionalClient } from '../providers/CurrentUserProvider';

/**
 * A React Query mutation hook for signing up a new user
 * Works inside BelongProvider context for automatic cache management
 * @returns A mutation object with the sign-up mutation and its status
 */
export function useSignUp() {
  const client = useOptionalClient();
  
  if (!client) {
    throw new Error(
      'useSignUp must be used within BelongProvider. ' +
      'Wrap your component with BelongProvider and provide configuration:\n\n' +
      '<BelongProvider config={{supabaseUrl, supabaseAnonKey, mapboxPublicToken}}>\n' +
      '  <YourComponent />\n' +
      '</BelongProvider>'
    );
  }
  
  const authService = createAuthService(client);

  return useMutation<Account, Error, { email: string; password: string; firstName: string; lastName?: string }>({
    mutationFn: async ({ email, password, firstName, lastName }) => {
      return authService.signUp(email, password, firstName, lastName);
    },
    onSuccess: (account) => {
      client.logger.info('🔐 API: User signed up successfully', { userId: account.id });
      // Note: Cache invalidation is handled by BelongProvider's centralized auth state listener
    },
    onError: (error) => {
      client.logger.error('🔐 API: Failed to sign up', { error });
    },
  });
}
