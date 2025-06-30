import { useMutation } from "@tanstack/react-query";
import { createAuthService } from "../services/auth.service";
import { useSupabase } from "../providers/CurrentUserProvider";

/**
 * React Query mutation hook for signing out the current user.
 * 
 * This hook handles user sign out by clearing the Supabase Auth session
 * and automatically invalidates all cached user data. Must be used within
 * a BelongProvider context for proper cache management.
 * 
 * @returns React Query mutation object for sign out operations
 * 
 * @example
 * ```tsx
 * function SignOutButton() {
 *   const signOut = useSignOut();
 *   
 *   const handleSignOut = async () => {
 *     try {
 *       await signOut.mutateAsync();
 *       console.log('User signed out successfully');
 *       // User will be redirected to sign in page automatically
 *     } catch (error) {
 *       console.error('Sign out failed:', error.message);
 *     }
 *   };
 * 
 *   return (
 *     <button 
 *       onClick={handleSignOut}
 *       disabled={signOut.isPending}
 *     >
 *       {signOut.isPending ? 'Signing out...' : 'Sign Out'}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function useAutoSignOut() {
 *   const signOut = useSignOut();
 *   
 *   // Sign out after session expires
 *   useEffect(() => {
 *     const timer = setTimeout(() => {
 *       signOut.mutate();
 *     }, 24 * 60 * 60 * 1000); // 24 hours
 *     
 *     return () => clearTimeout(timer);
 *   }, [signOut]);
 * }
 * ```
 * 
 * @category React Hooks
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
