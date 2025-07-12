import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { updateUser } from '../api';
import type { User } from '../types';

/**
 * Hook for updating existing user profiles.
 *
 * This hook provides functionality for updating user profile information such as
 * name, bio, profile picture, and other settings. Automatically invalidates
 * related queries on successful update. Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditProfileForm({ user }: { user: User }) {
 *   const updateUser = useUpdateUser();
 *
 *   const handleSubmit = useCallback(async (updates: Partial<User>) => {
 *     try {
 *       const updatedUser = await updateUser.mutateAsync({
 *         id: user.id,
 *         ...updates
 *       });
 *       console.log('Updated user:', updatedUser.id);
 *       // Handle success (e.g., close form, show toast)
 *     } catch (error) {
 *       console.error('Failed to update user:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [updateUser, user.id]);
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       handleSubmit({
 *         firstName: formData.get('firstName') as string,
 *         lastName: formData.get('lastName') as string,
 *         bio: formData.get('bio') as string,
 *       });
 *     }}>
 *       <input
 *         name="firstName"
 *         defaultValue={user.firstName}
 *         placeholder="First Name"
 *         required
 *       />
 *       <input
 *         name="lastName"
 *         defaultValue={user.lastName}
 *         placeholder="Last Name"
 *         required
 *       />
 *       <textarea
 *         name="bio"
 *         defaultValue={user.bio || ''}
 *         placeholder="Tell us about yourself..."
 *       />
 *       <button type="submit" disabled={updateUser.isPending}>
 *         {updateUser.isPending ? 'Updating...' : 'Update Profile'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Quick profile picture update
 * function ProfilePictureUpload({ userId }: { userId: string }) {
 *   const updateUser = useUpdateUser();
 *
 *   const handleFileUpload = async (file: File) => {
 *     const uploadedUrl = await uploadToStorage(file);
 *     await updateUser.mutateAsync({
 *       id: userId,
 *       profilePictureUrl: uploadedUrl
 *     });
 *   };
 *
 *   return (
 *     <input
 *       type="file"
 *       accept="image/*"
 *       onChange={(e) => {
 *         const file = e.target.files?.[0];
 *         if (file) handleFileUpload(file);
 *       }}
 *       disabled={updateUser.isPending}
 *     />
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (userData: Partial<User> & { id: string }) => {
      logger.debug('👤 useUpdateUser: Updating user', { id: userData.id });

      // Update user (auto-commits images internally)
      return updateUser(supabase, userData);
    },
    onSuccess: (updatedUser: User) => {
      // Clear entire cache since user data (name, avatar) is embedded in many entities
      queryClient.invalidateQueries();

      logger.info('👤 useUpdateUser: Successfully updated user', {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      });
    },
    onError: (error) => {
      logger.error('👤 useUpdateUser: Failed to update user', {
        error,
      });
    },
  });
}
