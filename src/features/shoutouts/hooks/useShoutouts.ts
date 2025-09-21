import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { fetchShoutouts } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { Shoutout, ShoutoutFilter } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { shoutoutKeys } from '../queries';

/**
 * Hook for fetching shoutouts received by a user.
 *
 * This hook provides functionality for retrieving shoutouts where users can
 * publicly recognize and thank others for their contributions.
 * Primarily used to view shoutouts received by the current user.
 * Must be used within a BelongProvider context.
 *
 * @param filters - Optional filters to apply to the shoutouts query (receiverId)
 * @returns React Query result with shoutout data and query state
 *
 * @example
 * ```tsx
 * function MyShoutoutsList() {
 *   // Load shoutouts received by current user
 *   const { data: myShoutouts, isPending, isError } = useShoutouts({
 *     receiverId: currentUser.id
 *   });
 *
 *   if (isPending) return <div>Loading shoutouts...</div>;
 *   if (isError) return <div>Error loading shoutouts</div>;
 *
 *   return (
 *     <div>
 *       {myShoutouts?.map(shoutout => (
 *         <div key={shoutout.id}>
 *           <p>{shoutout.message}</p>
 *           <p>From: {shoutout.senderId}</p>
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
  const supabase = useSupabase();

  const query = useQuery<Shoutout[], Error>({
    queryKey: filter?.receiverId
      ? shoutoutKeys.listByReceiver(filter.receiverId)
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
