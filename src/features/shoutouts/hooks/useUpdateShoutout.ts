import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { updateShoutout } from '../api';
import type { ShoutoutInput, Shoutout } from '../types';

/**
 * Hook for updating existing shoutouts.
 *
 * This hook provides functionality for updating shoutout messages, impact descriptions,
 * and other mutable properties. Only the original sender can update their shoutouts.
 * Automatically invalidates related queries on successful update.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditShoutoutForm({ shoutout }: { shoutout: Shoutout }) {
 *   const updateShoutout = useUpdateShoutout();
 *
 *   const handleSubmit = useCallback(async (updates: Partial<ShoutoutInput>) => {
 *     try {
 *       const updatedShoutout = await updateShoutout.mutateAsync({
 *         id: shoutout.id,
 *         data: updates
 *       });
 *       console.log('Updated shoutout:', updatedShoutout.id);
 *       // Handle success (e.g., close form, show toast)
 *     } catch (error) {
 *       console.error('Failed to update shoutout:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [updateShoutout, shoutout.id]);
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       handleSubmit({
 *         message: formData.get('message') as string,
 *         impactDescription: formData.get('impactDescription') as string,
 *       });
 *     }}>
 *       <textarea
 *         name="message"
 *         defaultValue={shoutout.message}
 *         placeholder="Your appreciation message..."
 *         required
 *       />
 *       <textarea
 *         name="impactDescription"
 *         defaultValue={shoutout.impactDescription || ''}
 *         placeholder="How did this help you?"
 *       />
 *       <button type="submit" disabled={updateShoutout.isPending}>
 *         {updateShoutout.isPending ? 'Updating...' : 'Update Shoutout'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUpdateShoutout() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ShoutoutInput>;
    }) => {
      logger.debug('📢 useUpdateShoutout: Updating shoutout', { id, data });
      return updateShoutout(supabase, id, data);
    },
    onSuccess: (updatedShoutout: Shoutout | null) => {
      // Invalidate all shoutout queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Update the specific shoutout in cache
      if (updatedShoutout) {
        queryClient.setQueryData(
          queryKeys.shoutouts.byId(updatedShoutout.id),
          updatedShoutout,
        );

        logger.info('📢 useUpdateShoutout: Successfully updated shoutout', {
          id: updatedShoutout.id,
          message: updatedShoutout.message,
        });
      }
    },
    onError: (error) => {
      logger.error('📢 useUpdateShoutout: Failed to update shoutout', {
        error,
      });
    },
  });

  // Return mutation with stable function reference
  return mutation;
}
