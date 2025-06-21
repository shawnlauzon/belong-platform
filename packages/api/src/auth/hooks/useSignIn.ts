import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { Account } from "@belongnetwork/types";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * A React Query mutation hook for signing in a user
 * Works inside BelongProvider context for automatic cache management
 * @returns A mutation object with the sign-in mutation and its status
 */
export function useSignIn() {
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  return useMutation<Account, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      return authService.signIn(email, password);
    },
  });
}
