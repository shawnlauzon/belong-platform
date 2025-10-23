import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { SHORT_CACHE_TIME } from '@/config';
import { fetchFeed } from '../api';

import type { Feed } from '../types';
import { feedKeys } from '../queries';

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
export function useFeed(options?: Partial<UseQueryOptions<Feed, Error>>) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  const query = useQuery<Feed, Error>({
    queryKey: feedKeys.feed(),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchFeed(supabase, currentUser.id);
    },
    enabled: !!supabase && !!currentUser,
    staleTime: SHORT_CACHE_TIME,
    ...options,
  });

  return query;
}
