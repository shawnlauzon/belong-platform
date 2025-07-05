import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut } from '../api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';

/**
 * Hook for signing out the current user.
 * 
 * Provides a mutation function for signing out users.
 * Automatically invalidates auth cache on successful sign out.
 * 
 * @returns Sign out mutation function
 * 
 * @example
 * ```tsx
 * function SignOutButton() {
 *   const signOut = useSignOut();
 *   
 *   const handleSignOut = async () => {
 *     try {
 *       await signOut();
 *       // User is now signed out
 *     } catch (error) {
 *       console.error('Sign out failed:', error);
 *     }
 *   };
 *   
 *   return (
 *     <button onClick={handleSignOut}>
 *       Sign Out
 *     </button>
 *   );
 * }
 * ```
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: () => signOut(supabase),
    onSuccess: () => {
      logger.info('🔐 API: User signed out successfully');
      
      // Invalidate auth cache since user is now signed out
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation.mutate]
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation.mutateAsync]
    ),
  };
}