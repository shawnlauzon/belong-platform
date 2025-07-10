import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { declineResource } from '../api';
import { useCurrentUser } from '@/features/auth';

/**
 * Hook for declining a resource (offer or request).
 *
 * Provides a mutation function for users to decline resources.
 * Automatically invalidates resource caches on successful decline.
 *
 * @returns React Query mutation result with decline function and state
 *
 * @example
 * ```tsx
 * function DeclineResourceButton({ resourceId }) {
 *   const { mutate: declineResource, isPending, error } = useDeclineResource();
 *
 *   const handleDecline = () => {
 *     if (!confirm('Are you sure you want to decline this resource?')) {
 *       return;
 *     }
 *
 *     declineResource(resourceId, {
 *       onSuccess: () => {
 *         // User successfully declined resource
 *       },
 *       onError: (error) => {
 *         console.error('Failed to decline resource:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleDecline} disabled={isPending}>
 *       {isPending ? 'Declining...' : 'Decline Resource'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeclineResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  return useMutation({
    mutationFn: (resourceId: string) => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to decline resources');
      }
      
      return declineResource(supabase, resourceId);
    },
    onSuccess: (response, resourceId) => {
      if (response) {
        // Invalidate resource queries to refresh response data
        queryClient.invalidateQueries({ queryKey: queryKeys.resources.byId(resourceId) });
        queryClient.invalidateQueries({ queryKey: ['resource_responses', 'by_resource', resourceId] });
        queryClient.invalidateQueries({ queryKey: ['resource_responses'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });

        logger.info('📚 API: Successfully declined resource', {
          resourceId,
          userId: response.userId,
        });
      }
    },
    onError: (error) => {
      logger.error('📚 API: Failed to decline resource', { error });
    },
  });
}