import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { fetchShoutouts } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { Shoutout, ShoutoutFilter } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { shoutoutKeys } from '../queries';

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
 *           <p>From: {shoutout.senderId} To: {shoutout.receiverId}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useShoutouts(
  filter?: ShoutoutFilter,
  options?: Partial<UseQueryOptions<Shoutout[], Error>>,
): UseQueryResult<Shoutout[], Error> {
  if (
    (filter?.resourceId && (filter?.communityId || filter?.senderId)) ||
    (filter?.communityId && filter?.senderId)
  ) {
    throw new Error(
      'Can only filter by one of resourceId, communityId, or senderId',
    );
  }

  const supabase = useSupabase();

  const query = useQuery<Shoutout[], Error>({
    queryKey: filter?.resourceId
      ? shoutoutKeys.listByResource(filter.resourceId)
      : filter?.communityId
        ? shoutoutKeys.listByCommunity(filter.communityId)
        : filter?.senderId
          ? shoutoutKeys.listBySender(filter.senderId)
          : shoutoutKeys.all,
    queryFn: () => {
      logger.debug('📢 useShoutouts: Fetching shoutouts', filter);
      return fetchShoutouts(supabase, filter);
    },
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('📢 API: Error fetching shoutouts', {
      error: query.error,
    });
  }

  return query;
}
