import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { Account } from "@belongnetwork/types";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * React Query mutation hook for signing in users with email and password.
 * 
 * This hook handles user authentication by calling Supabase Auth and returns
 * an Account object containing the authenticated user's basic information.
 * Must be used within a BelongProvider context.
 * 
 * @returns React Query mutation object for sign in operations
 * 
 * @example
 * ```tsx
 * function SignInForm() {
 *   const signIn = useSignIn();
 *   
 *   const handleSubmit = async (formData) => {
 *     try {
 *       const account = await signIn.mutateAsync({
 *         email: formData.email,
 *         password: formData.password
 *       });
 *       console.log('Signed in user:', account.id);
 *     } catch (error) {
 *       console.error('Sign in failed:', error.message);
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input type="email" placeholder="Email" />
 *       <input type="password" placeholder="Password" />
 *       <button 
 *         type="submit" 
 *         disabled={signIn.isPending}
 *       >
 *         {signIn.isPending ? 'Signing in...' : 'Sign In'}
 *       </button>
 *       {signIn.error && <div>Error: {signIn.error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
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
