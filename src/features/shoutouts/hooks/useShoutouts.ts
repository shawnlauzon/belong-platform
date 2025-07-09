import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys, toRecords } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createShoutoutsService } from '../services/shoutouts.service';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { ShoutoutInfo, ShoutoutFilter } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Hook for fetching a list of shoutouts with optional filtering.
 *
 * This hook provides functionality for retrieving shoutouts where users can
 * publicly recognize and thank others for their contributions. The query is
 * enabled by default and supports optional filtering by sender, receiver, or resource.
 * Must be used within a BelongProvider context.
 *
 * @param filters - Optional filters to apply to the shoutouts query
 * @returns React Query result with shoutout data and query state
 *
 * @example
 * ```tsx
 * function ShoutoutsList() {
 *   // Load all shoutouts
 *   const { data: allShoutouts, isPending, isError } = useShoutouts();
 *
 *   // Load shoutouts sent by a specific user
 *   const { data: userShoutouts } = useShoutouts({ sentBy: 'user-123' });
 *
 *   // Load shoutouts for a specific resource
 *   const { data: resourceShoutouts } = useShoutouts({ resourceId: 'resource-456' });
 *
 *   if (isPending) return <div>Loading shoutouts...</div>;
 *   if (isError) return <div>Error loading shoutouts</div>;
 *
 *   return (
 *     <div>
 *       {allShoutouts?.map(shoutout => (
 *         <div key={shoutout.id}>
 *           <p>{shoutout.message}</p>
 *           <p>From: {shoutout.fromUserId} To: {shoutout.toUserId}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useShoutouts(filters?: ShoutoutFilter): UseQueryResult<ShoutoutInfo[], Error> {
  const supabase = useSupabase();
  const shoutoutsService = createShoutoutsService(supabase);

  const query = useQuery<ShoutoutInfo[], Error>({
    queryKey: filters
      ? queryKeys.shoutouts.filtered(toRecords(filters))
      : queryKeys.shoutouts.all,
    queryFn: () => {
      logger.debug('📢 useShoutouts: Fetching shoutouts', { filters });
      return shoutoutsService.fetchShoutouts(filters);
    },
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📢 API: Error fetching shoutouts', {
      error: query.error,
    });
  }

  return query;
}