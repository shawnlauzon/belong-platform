import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { Account } from "@belongnetwork/types";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * React Query mutation hook for registering new users with email and password.
 * 
 * This hook creates new user accounts by calling Supabase Auth and automatically
 * creates a user profile. Returns an Account object containing the new user's
 * basic information. Must be used within a BelongProvider context.
 * 
 * @returns React Query mutation object for sign up operations
 * 
 * @example
 * ```tsx
 * function SignUpForm() {
 *   const signUp = useSignUp();
 *   
 *   const handleSubmit = async (formData) => {
 *     try {
 *       const account = await signUp.mutateAsync({
 *         email: formData.email,
 *         password: formData.password,
 *         firstName: formData.firstName,
 *         lastName: formData.lastName // optional
 *       });
 *       console.log('Created account:', account.id);
 *     } catch (error) {
 *       console.error('Sign up failed:', error.message);
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input type="email" placeholder="Email" required />
 *       <input type="password" placeholder="Password" required />
 *       <input type="text" placeholder="First Name" required />
 *       <input type="text" placeholder="Last Name" />
 *       <button 
 *         type="submit" 
 *         disabled={signUp.isPending}
 *       >
 *         {signUp.isPending ? 'Creating account...' : 'Sign Up'}
 *       </button>
 *       {signUp.error && <div>Error: {signUp.error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
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
