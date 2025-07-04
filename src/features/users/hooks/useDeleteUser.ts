import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createUserService } from '../services/user.service';

/**
 * Hook for deleting user profiles.
 *
 * This hook provides functionality for deleting user accounts (soft delete - marks
 * user as deleted rather than physically removing). Automatically invalidates and
 * removes related queries on successful deletion. Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function UserManagement({ user }: { user: User }) {
 *   const deleteUser = useDeleteUser();
 *   
 *   const handleDelete = useCallback(async () => {
 *     if (!confirm(`Are you sure you want to delete ${user.firstName}'s account?`)) {
 *       return;
 *     }
 *     
 *     try {
 *       await deleteUser.mutateAsync(user.id);
 *       console.log('Deleted user:', user.id);
 *       // Handle success (e.g., redirect, show toast)
 *     } catch (error) {
 *       console.error('Failed to delete user:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [deleteUser, user.id, user.firstName]);
 *
 *   return (
 *     <div>
 *       <h3>{user.firstName} {user.lastName}</h3>
 *       <button 
 *         onClick={handleDelete}
 *         disabled={deleteUser.isPending}
 *         className="danger-button"
 *       >
 *         {deleteUser.isPending ? 'Deleting...' : 'Delete Account'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With confirmation dialog and error handling
 * function DeleteUserButton({ userId }: { userId: string }) {
 *   const deleteUser = useDeleteUser();
 *   
 *   const handleDelete = async () => {
 *     try {
 *       await deleteUser.mutateAsync(userId);
 *       toast.success('User account deleted successfully');
 *       router.push('/admin/users');
 *     } catch (error) {
 *       toast.error('Failed to delete user account');
 *     }
 *   };
 *
 *   return (
 *     <ConfirmDialog
 *       title="Delete User Account"
 *       message="Are you sure you want to delete this user account? This action cannot be undone."
 *       onConfirm={handleDelete}
 *       loading={deleteUser.isPending}
 *     >
 *       <Button variant="danger">Delete Account</Button>
 *     </ConfirmDialog>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Bulk user deletion
 * function BulkUserActions({ selectedUserIds }: { selectedUserIds: string[] }) {
 *   const deleteUser = useDeleteUser();
 *   
 *   const handleBulkDelete = async () => {
 *     for (const userId of selectedUserIds) {
 *       try {
 *         await deleteUser.mutateAsync(userId);
 *       } catch (error) {
 *         console.error(`Failed to delete user ${userId}:`, error);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <button 
 *       onClick={handleBulkDelete}
 *       disabled={deleteUser.isPending || selectedUserIds.length === 0}
 *     >
 *       Delete Selected ({selectedUserIds.length})
 *     </button>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  const mutation = useMutation({
    mutationFn: (userId: string) => {
      logger.debug('👤 useDeleteUser: Deleting user', { userId });
      return userService.deleteUser(userId);
    },
    onSuccess: (_, userId) => {
      // Invalidate all user queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Remove the specific user from cache
      queryClient.removeQueries({
        queryKey: queryKeys.users.byId(userId),
      });

      logger.info('👤 useDeleteUser: Successfully deleted user', {
        id: userId,
      });
    },
    onError: (error) => {
      logger.error('👤 useDeleteUser: Failed to delete user', {
        error,
      });
    },
  });

  // Return mutation with stable function reference
  return {
    ...mutation,
    mutate: useCallback(mutation.mutate, [mutation.mutate]),
    mutateAsync: useCallback(mutation.mutateAsync, [mutation.mutateAsync]),
  };
}