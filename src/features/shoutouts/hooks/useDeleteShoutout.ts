import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createShoutoutsService } from '../services/shoutouts.service';

/**
 * Hook for deleting shoutouts.
 *
 * This hook provides functionality for deleting shoutouts. Only the original sender
 * can delete their shoutouts. Automatically invalidates and removes related queries
 * on successful deletion. Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function ShoutoutActions({ shoutout }: { shoutout: Shoutout }) {
 *   const deleteShoutout = useDeleteShoutout();
 *   
 *   const handleDelete = useCallback(async () => {
 *     if (!confirm('Are you sure you want to delete this shoutout?')) {
 *       return;
 *     }
 *     
 *     try {
 *       await deleteShoutout.mutateAsync(shoutout.id);
 *       console.log('Deleted shoutout:', shoutout.id);
 *       // Handle success (e.g., redirect, show toast)
 *     } catch (error) {
 *       console.error('Failed to delete shoutout:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [deleteShoutout, shoutout.id]);
 *
 *   return (
 *     <div>
 *       <button 
 *         onClick={handleDelete}
 *         disabled={deleteShoutout.isPending}
 *         className="danger-button"
 *       >
 *         {deleteShoutout.isPending ? 'Deleting...' : 'Delete Shoutout'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With confirmation dialog and error handling
 * function DeleteShoutoutButton({ shoutoutId }: { shoutoutId: string }) {
 *   const deleteShoutout = useDeleteShoutout();
 *   
 *   const handleDelete = async () => {
 *     try {
 *       await deleteShoutout.mutateAsync(shoutoutId);
 *       toast.success('Shoutout deleted successfully');
 *     } catch (error) {
 *       toast.error('Failed to delete shoutout');
 *     }
 *   };
 *
 *   return (
 *     <ConfirmDialog
 *       title="Delete Shoutout"
 *       message="Are you sure you want to delete this shoutout? This action cannot be undone."
 *       onConfirm={handleDelete}
 *       loading={deleteShoutout.isPending}
 *     >
 *       <Button variant="danger">Delete</Button>
 *     </ConfirmDialog>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useDeleteShoutout() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const shoutoutsService = createShoutoutsService(supabase);

  const mutation = useMutation({
    mutationFn: (shoutoutId: string) => {
      logger.debug('📢 useDeleteShoutout: Deleting shoutout', { shoutoutId });
      return shoutoutsService.deleteShoutout(shoutoutId);
    },
    onSuccess: (_, shoutoutId) => {
      // Invalidate all shoutout queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Remove the specific shoutout from cache
      queryClient.removeQueries({
        queryKey: queryKeys.shoutouts.byId(shoutoutId),
      });

      logger.info('📢 useDeleteShoutout: Successfully deleted shoutout', {
        id: shoutoutId,
      });
    },
    onError: (error) => {
      logger.error('📢 useDeleteShoutout: Failed to delete shoutout', {
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