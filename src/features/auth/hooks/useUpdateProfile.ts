import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/features/users';
import { updateUser } from '@/features/users/api';
import { useSupabase } from '@/shared';
import { logger } from '@/shared';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook for updating the current user's profile.
 *
 * Provides a mutation function for updating user profile information.
 * Automatically updates the user cache on successful update.
 *
 * @returns Update profile mutation function
 *
 * @example
 * ```tsx
 * function ProfileForm() {
 *   const updateProfile = useUpdateProfile();
 *   const currentUser = useCurrentUser();
 *   const [firstName, setFirstName] = useState(currentUser?.firstName || '');
 *   const [lastName, setLastName] = useState(currentUser?.lastName || '');
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await updateProfile({ firstName, lastName });
 *       // Profile updated successfully
 *     } catch (error) {
 *       console.error('Update failed:', error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={firstName}
 *         onChange={(e) => setFirstName(e.target.value)}
 *       />
 *       <input
 *         value={lastName}
 *         onChange={(e) => setLastName(e.target.value)}
 *       />
 *       <button type="submit">Update Profile</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation<User, Error, Partial<User>>({
    mutationFn: (updates: Partial<User>) => {
      if (!currentUser?.data?.id) {
        throw new Error('No authenticated user to update');
      }
      return updateUser(supabase, {
        id: currentUser.data.id,
        ...updates,
      });
    },
    onSuccess: (updatedUser: User) => {
      logger.info('🔐 API: Profile updated successfully', {
        userId: updatedUser.id,
      });

      // Update the user cache with new data
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to update profile', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (updates: Partial<User>) => {
      return mutation.mutateAsync(updates);
    },
    [mutation],
  );
}
