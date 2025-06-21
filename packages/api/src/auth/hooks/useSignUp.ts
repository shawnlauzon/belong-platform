import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { Account } from "@belongnetwork/types";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * A React Query mutation hook for signing up a new user
 * Works inside BelongProvider context for automatic cache management
 * @returns A mutation object with the sign-up mutation and its status
 */
export function useSignUp() {
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  return useMutation<
    Account,
    Error,
    { email: string; password: string; firstName: string; lastName?: string }
  >({
    mutationFn: async ({ email, password, firstName, lastName }) => {
      return authService.signUp(email, password, firstName, lastName);
    },
  });
}
