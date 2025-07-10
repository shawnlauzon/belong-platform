import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { acceptResource } from '../api';
import { useCurrentUser } from '@/features/auth';

import type { ResourceResponseStatus } from '../types';

/**
 * Hook for accepting a resource (offer or request).
 *
 * Provides a mutation function for users to accept resources.
 * Automatically invalidates resource caches on successful acceptance.
 *
 * @returns React Query mutation result with accept function and state
 *
 * @example
 * ```tsx
 * function AcceptResourceButton({ resourceId }) {
 *   const acceptResourceMutation = useAcceptResource();
 *
 *   const handleAccept = async (status = 'accepted') => {
 *     try {
 *       await acceptResourceMutation.mutateAsync({ resourceId, status });
 *       // Successfully accepted resource
 *     } catch (error) {
 *       console.error('Failed to accept resource:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button 
 *         onClick={() => handleAccept('accepted')} 
 *         disabled={acceptResourceMutation.isPending}
 *       >
 *         {acceptResourceMutation.isPending ? 'Accepting...' : 'Accept'}
 *       </button>
 *       <button 
 *         onClick={() => handleAccept('interested')} 
 *         disabled={acceptResourceMutation.isPending}
 *       >
 *         {acceptResourceMutation.isPending ? 'Accepting...' : 'Interested'}
 *       </button>
 *       {acceptResourceMutation.error && (
 *         <div className="error">{acceptResourceMutation.error.message}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAcceptResource() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      resourceId,
      status = 'accepted',
    }: {
      resourceId: string;
      status?: ResourceResponseStatus;
    }) => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to accept resources');
      }
      
      return acceptResource(supabase, resourceId, status);
    },
    onSuccess: (response, { resourceId }) => {
      if (response) {
        // Invalidate resource queries to refresh response data
        queryClient.invalidateQueries({ queryKey: queryKeys.resources.byId(resourceId) });
        queryClient.invalidateQueries({ queryKey: ['resource_responses', 'by_resource', resourceId] });
        queryClient.invalidateQueries({ queryKey: ['resource_responses'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });

        logger.info('📚 API: Successfully accepted resource', {
          resourceId,
          userId: response.userId,
          status: response.status,
        });
      }
    },
    onError: (error) => {
      logger.error('📚 API: Failed to accept resource', { error });
    },
  });
}