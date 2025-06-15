import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signUp } from '../impl/signUp';
import { AuthUser } from '@belongnetwork/types';

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

  return useMutation<AuthUser, Error, SignUpData>(
    async ({ email, password, firstName, lastName }) => {
      return signUp(email, password, { firstName, lastName });
    },
    {
      onSuccess: (data) => {
        // Invalidate any queries that depend on the current user
        queryClient.setQueryData(['currentUser'], data);
      },
    }
  );
}
