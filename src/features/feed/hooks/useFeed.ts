import { useQuery, QueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchFeed } from '../api';

import type { Feed } from '../types';

/**
 * Hook for fetching the user's feed.
 *
 * Provides a chronologically ordered feed of resources and shoutouts from
 * all communities the user has joined.
 *
 * @returns Query state for feed data
 *
 * @example
 * ```tsx
 * function FeedScreen() {
 *   const { data: feed, isPending, error } = useFeed();
 *
 *   if (isPending) return <div>Loading feed...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Your Feed</h2>
 *       {feed?.items.map(item => (
 *         <FeedItem key={`${item.type}-${item.id}`} item={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeed(options?: Partial<QueryOptions<Feed, Error>>) {
  const supabase = useSupabase();

  const query = useQuery<Feed, Error>({
    queryKey: ['feed'] as const,
    queryFn: () => fetchFeed(supabase),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  return query;
}
