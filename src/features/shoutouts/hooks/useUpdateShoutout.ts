import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import { useCurrentUser } from '@/features/auth';
import { updateShoutout } from '../api';
import type { ShoutoutInput, Shoutout } from '../types';
import { shoutoutKeys } from '../queries';

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
  const { data: currentUser } = useCurrentUser();

  const mutation = useMutation({
    mutationFn: (data: Partial<ShoutoutInput> & { id: string }) => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      logger.debug('📢 useUpdateShoutout: Updating shoutout', data);
      return updateShoutout(supabase, currentUser.id, data);
    },
    onSuccess: (updatedShoutout: Shoutout | null, variables) => {
      // Update the specific shoutout in cache
      if (updatedShoutout) {
        queryClient.setQueryData(
          shoutoutKeys.detail(variables.id),
          updatedShoutout,
        );

        // Invalidate all shoutouts cache (covers all lists)
        queryClient.invalidateQueries({
          queryKey: shoutoutKeys.all,
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
