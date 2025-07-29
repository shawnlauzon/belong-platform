import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import type { Shoutout, ShoutoutInput } from '../types';
import { Resource } from '@/features/resources';
import { createShoutout } from '../api/createShoutout';
import { shoutoutKeys } from '../queries';
import { resourceKeys } from '@/features/resources/queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';

/**
 * Hook for creating new shoutouts.
 *
 * This hook provides functionality for creating new appreciation posts where
 * users can publicly recognize and thank others for their contributions.
 * Automatically invalidates related queries on successful creation.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CreateShoutoutForm() {
 *   const createShoutout = useCreateShoutout();
 *
 *   const handleSubmit = useCallback(async (formData: ShoutoutInput) => {
 *     try {
 *       const newShoutout = await createShoutout.mutateAsync(formData);
 *       console.log('Created shoutout:', newShoutout.id);
 *       // Handle success (e.g., redirect, show toast)
 *     } catch (error) {
 *       console.error('Failed to create shoutout:', error);
 *       // Handle error (e.g., show error message)
 *     }
 *   }, [createShoutout]);
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       handleSubmit({
 *         message: formData.get('message') as string,
 *         receiverId: formData.get('receiverId') as string,
 *         resourceId: formData.get('resourceId') as string,
 *       });
 *     }}>
 *       <textarea name="message" placeholder="Your appreciation message..." required />
 *       <input name="receiverId" placeholder="Recipient user ID" required />
 *       <input name="resourceId" placeholder="Related resource ID" required />
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

  const mutation = useMutation({
    mutationFn: (input: ShoutoutInput) => {
      logger.debug('📢 useCreateShoutout: Creating shoutout', { input });
      const resource = queryClient.getQueryData<Resource>(
        resourceKeys.detail(input.resourceId),
      );
      if (!resource) {
        throw new Error('Resource not found');
      }
      return createShoutout(supabase, {
        ...input,
        ...resource,
        communityId: resource.communityIds[0] || '',
        receiverId: resource.ownerId,
      });
    },
    onSuccess: (newShoutout: Shoutout) => {
      // Set the new shoutout in cache for immediate access
      queryClient.setQueryData(
        shoutoutKeys.detail(newShoutout.id),
        newShoutout,
      );

      // TODO Only invalidate the affected community
      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.listsByCommunity(),
      });

      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.listByResource(newShoutout.resourceId),
      });

      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.listBySender(newShoutout.senderId),
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
