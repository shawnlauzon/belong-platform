import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn } from '../api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';

/**
 * Hook for signing in a user.
 * 
 * Provides a mutation function for authenticating users with email and password.
 * Automatically invalidates auth cache on successful sign in.
 * 
 * @returns Sign in mutation function
 * 
 * @example
 * ```tsx
 * function SignInForm() {
 *   const signIn = useSignIn();
 *   const [email, setEmail] = useState('');
 *   const [password, setPassword] = useState('');
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await signIn({ email, password });
 *       // User is now signed in
 *     } catch (error) {
 *       console.error('Sign in failed:', error);
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={email} onChange={(e) => setEmail(e.target.value)} />
 *       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
 *       <button type="submit">Sign In</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSignIn() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(supabase, email, password),
    onSuccess: (account) => {
      logger.info('🔐 API: User signed in successfully', {
        userId: account.id,
      });

      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['user', account.id] });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign in', { error });
    },
  });

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation]
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation]
    ),
  };
}