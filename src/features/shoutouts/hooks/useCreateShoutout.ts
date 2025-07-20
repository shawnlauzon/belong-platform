import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { useCurrentUser } from '../../auth';
import type { Shoutout, ShoutoutInput } from '../types';
import { Resource } from '@/features/resources';
import { createShoutout } from '../api/createShoutout';

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
 *         toUserId: formData.get('toUserId') as string,
 *         resourceId: formData.get('resourceId') as string,
 *       });
 *     }}>
 *       <textarea name="message" placeholder="Your appreciation message..." required />
 *       <input name="toUserId" placeholder="Recipient user ID" required />
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
  const { data: currentUser } = useCurrentUser();

  const mutation = useMutation({
    mutationFn: (input: ShoutoutInput) => {
      logger.debug('📢 useCreateShoutout: Creating shoutout', { input });
      const resource = queryClient.getQueryData<Resource>(
        queryKeys.resources.byId(input.resourceId),
      );
      if (!resource) {
        throw new Error('Resource not found');
      }
      return createShoutout(supabase, {
        ...input,
        ...resource,
        communityId: resource.communityIds[0] || '',
        toUserId: resource.ownerId,
      });
    },
    onSuccess: (newShoutout: Shoutout) => {
      // Invalidate all shoutout queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Set the new shoutout in cache for immediate access
      queryClient.setQueryData(
        queryKeys.shoutouts.byId(newShoutout.id),
        newShoutout,
      );

      // Invalidate all user data (including activities) using hierarchical invalidation
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['user', currentUser.id] });
      }

      logger.info('📢 useCreateShoutout: Successfully created shoutout', {
        id: newShoutout.id,
        message: newShoutout.message,
        fromUserId: newShoutout.fromUserId,
        toUserId: newShoutout.toUserId,
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
