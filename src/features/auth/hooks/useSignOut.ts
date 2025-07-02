import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAuthService } from '../services/auth.service';
import { useSupabase } from '../../../shared';
import { logger } from '../../../shared';

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
  const authService = createAuthService(supabase);

  const mutation = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      logger.info('🔐 API: User signed out successfully');
      
      // Invalidate auth cache since user is now signed out
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });

  // Return stable function reference
  return useCallback(() => {
    return mutation.mutateAsync();
  }, [mutation.mutateAsync]);
}