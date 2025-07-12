import { useQuery } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchResourceResponses } from '../api';

import type { ResourceResponse } from '../types';

export interface UseResourceResponsesParams {
  resourceId?: string;
  userId?: string;
  status?: 'accepted' | 'interested' | 'declined';
  enabled?: boolean;
}

/**
 * Hook for fetching resource responses with optional filtering.
 *
 * @param params - Parameters for filtering responses
 * @param params.resourceId - Filter by specific resource ID
 * @param params.userId - Filter by specific user ID
 * @param params.status - Filter by response status
 * @param params.enabled - Whether the query should be enabled (default: true)
 *
 * @returns React Query result with resource responses data and state
 *
 * @example
 * ```tsx
 * // Get all responses for a specific resource
 * function ResourceResponsesList({ resourceId }) {
 *   const { data: responses, isLoading, error } = useResourceResponses({
 *     resourceId
 *   });
 *
 *   if (isLoading) return <div>Loading responses...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h3>People who responded:</h3>
 *       {responses?.map(response => (
 *         <div key={`${response.resourceId}-${response.userId}`}>
 *           <p>Status: {response.status}</p>
 *           <p>User: {response.userId}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * // Get current user's responses
 * function MyResponses({ userId }) {
 *   const { data: myResponses } = useResourceResponses({
 *     userId,
 *     status: 'accepted'
 *   });
 *
 *   return (
 *     <div>
 *       <h3>My accepted resources:</h3>
 *       {myResponses?.map(response => (
 *         <div key={`${response.resourceId}-${response.userId}`}>
 *           Resource: {response.resourceId}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResourceResponses(params: UseResourceResponsesParams = {}) {
  const supabase = useSupabase();
  const { resourceId, userId, status, enabled = true } = params;

  return useQuery({
    queryKey: [
      'resource_responses',
      ...(resourceId ? ['by_resource', resourceId] : []),
      ...(userId ? ['by_user', userId] : []),
      ...(status ? ['status', status] : []),
    ],
    queryFn: async (): Promise<ResourceResponse[]> => {
      logger.info('📚 API: Fetching resource responses', {
        resourceId,
        userId,
        status,
      });

      const result = await fetchResourceResponses(supabase, {
        resourceId,
        userId,
        status,
      });

      logger.info('📚 API: Successfully fetched resource responses', {
        count: result.length,
        resourceId,
        userId,
        status,
      });

      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
