import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import { useCurrentUser } from '@/features/auth';
import type { Shoutout, ShoutoutInput } from '../types';
import { createShoutout } from '../api/createShoutout';
import { shoutoutKeys } from '../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

/**
 * Hook for creating new shoutouts.
 *
 * This hook provides functionality for creating new appreciation posts where
 * users can publicly recognize and thank others for their contributions.
 * The receiver and community are automatically determined from the resource.
 * Automatically invalidates related queries on successful creation.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CreateShoutoutForm({ resourceId }: { resourceId: string }) {
 *   const createShoutout = useCreateShoutout();
 *
 *   const handleSubmit = useCallback(async (message: string) => {
 *     try {
 *       const newShoutout = await createShoutout.mutateAsync({
 *         message,
 *         resourceId
 *       });
 *       console.log('Created shoutout:', newShoutout.id);
 *       // Handle success (e.g., redirect, show toast)
 *     } catch (error) {
 *       console.error('Failed to create shoutout:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [createShoutout, resourceId]);
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       handleSubmit(formData.get('message') as string);
 *     }}>
 *       <textarea name="message" placeholder="Your appreciation message..." required />
 *       <button type="submit" disabled={createShoutout.isPending}>
 *         {createShoutout.isPending ? 'Creating...' : 'Create Shoutout'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useCreateShoutout() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const mutation = useMutation({
    mutationFn: (input: Omit<ShoutoutInput, 'receiverId' | 'communityId'>) => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      logger.debug('📢 useCreateShoutout: Creating shoutout', { input });
      return createShoutout(supabase, currentUser.id, input);
    },
    onSuccess: (newShoutout: Shoutout) => {
      // Set the new shoutout in cache for immediate access
      queryClient.setQueryData(
        shoutoutKeys.detail(newShoutout.id),
        newShoutout,
      );

      // Invalidate all shoutouts cache (covers all lists including receiver's)
      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.all,
      });

      // Invalidate trust scores for sender and receiver
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.listByUser(newShoutout.senderId),
      });
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.listByUser(newShoutout.receiverId),
      });

      logger.info('📢 useCreateShoutout: Successfully created shoutout', {
        id: newShoutout.id,
        message: newShoutout.message,
        receiverId: newShoutout.receiverId,
        senderId: newShoutout.senderId,
        resourceId: newShoutout.resourceId,
        communityId: newShoutout.communityId,
      });
    },
    onError: (error) => {
      logger.error('📢 useCreateShoutout: Failed to create shoutout', {
        error,
      });
    },
  });

  // Return mutation with stable function reference
  return mutation;
}
