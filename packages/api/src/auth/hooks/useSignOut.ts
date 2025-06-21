import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * A React Query mutation hook for signing out the current user
 * Works inside BelongProvider context for automatic cache management
 * @returns A mutation object with the sign-out mutation and its status
 */
export function useSignOut() {
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      return authService.signOut();
    },
  });
}
