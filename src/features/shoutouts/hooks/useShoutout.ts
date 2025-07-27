import { useQuery, QueryOptions } from '@tanstack/react-query';
import { logger } from '../../../shared';
import { useSupabase } from '../../../shared';
import { fetchShoutoutById } from '../api';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { Shoutout } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { shoutoutKeys } from '../queries';

/**
 * Hook for fetching a single shoutout by ID.
 *
 * This hook provides functionality for retrieving a complete shoutout object
 * including full User and Resource objects (not just IDs). The query is enabled
 * when a valid shoutoutId is provided. Must be used within a BelongProvider context.
 *
 * @param shoutoutId - The ID of the shoutout to fetch
 * @returns React Query result with shoutout data and query state
 *
 * @example
 * ```tsx
 * function ShoutoutDetail({ shoutoutId }: { shoutoutId: string }) {
 *   const { data: shoutout, isPending, isError } = useShoutout(shoutoutId);
 *
 *   if (isPending) return <div>Loading shoutout...</div>;
 *   if (isError) return <div>Error loading shoutout</div>;
 *   if (!shoutout) return <div>Shoutout not found</div>;
 *
 *   return (
 *     <div>
 *       <h3>{shoutout.message}</h3>
 *       <p>From: {shoutout.fromUser.firstName} {shoutout.fromUser.lastName}</p>
 *       <p>To: {shoutout.toUser.firstName} {shoutout.toUser.lastName}</p>
 *       <p>Resource: {shoutout.resource.title}</p>
 *       {shoutout.imageUrls.map((url, index) => (
 *         <img key={index} src={url} alt={`Shoutout image ${index + 1}`} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useShoutout(
  shoutoutId: string,
  options?: Partial<QueryOptions<Shoutout | null, Error>>,
): UseQueryResult<Shoutout | null, Error> {
  const supabase = useSupabase();

  const query = useQuery<Shoutout | null, Error>({
    queryKey: shoutoutKeys.detail(shoutoutId),
    queryFn: () => {
      logger.debug('📢 useShoutout: Fetching shoutout by ID', { shoutoutId });
      return fetchShoutoutById(supabase, shoutoutId);
    },
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('📢 API: Error fetching shoutout', {
      error: query.error,
    });
  }

  return query;
}
