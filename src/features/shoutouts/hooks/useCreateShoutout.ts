import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createShoutoutsService } from '../services/shoutouts.service';
import type { ShoutoutData, Shoutout } from '../types';

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
 *   const handleSubmit = useCallback(async (formData: ShoutoutData) => {
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
 *         impactDescription: formData.get('impactDescription') as string,
 *       });
 *     }}>
 *       <textarea name="message" placeholder="Your appreciation message..." required />
 *       <input name="toUserId" placeholder="Recipient user ID" required />
 *       <input name="resourceId" placeholder="Related resource ID" required />
 *       <textarea name="impactDescription" placeholder="How did this help you?" />
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
  const shoutoutsService = createShoutoutsService(supabase);

  const mutation = useMutation({
    mutationFn: (data: ShoutoutData) => {
      logger.debug('📢 useCreateShoutout: Creating shoutout', { data });
      return shoutoutsService.createShoutout(data);
    },
    onSuccess: (newShoutout: Shoutout) => {
      // Invalidate all shoutout queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Set the new shoutout in cache for immediate access
      queryClient.setQueryData(
        queryKeys.shoutouts.byId(newShoutout.id),
        newShoutout
      );

      logger.info('📢 useCreateShoutout: Successfully created shoutout', {
        id: newShoutout.id,
        message: newShoutout.message,
        fromUserId: newShoutout.fromUser?.id,
        toUserId: newShoutout.toUser?.id,
      });
    },
    onError: (error) => {
      logger.error('📢 useCreateShoutout: Failed to create shoutout', {
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