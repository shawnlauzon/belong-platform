import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn } from '../impl/signIn';
import { AuthUser } from '@belongnetwork/types';

/**
 * A React Query mutation hook for signing in a user
 * @returns A mutation object with the sign-in mutation and its status
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, Error, { email: string; password: string }>(
    async ({ email, password }) => {
      return signIn(email, password);
    },
    {
      onSuccess: (data) => {
        // Invalidate any queries that depend on the current user
        queryClient.setQueryData(['currentUser'], data);
      },
    }
  );
}
