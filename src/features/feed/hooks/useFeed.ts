import { useQuery } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { getCurrentUser } from '../../auth/api';
import { fetchUserCommunities } from '../../communities/api';
import { fetchResources } from '../../resources/api';
import { fetchEvents } from '../../events/api';

import type { FeedInfo } from '../types';

/**
 * Hook for fetching the user's feed.
 *
 * Provides a chronologically ordered feed of resources and events from
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
 *         <FeedItem key={`${item.type}-${item.data.id}`} item={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeed() {
  const supabase = useSupabase();

  const query = useQuery<FeedInfo, Error>({
    queryKey: ['feed'] as const,
    queryFn: async () => {
      try {
        logger.debug('📰 API: Fetching feed data');

        // Get current user first
        const currentUser = await getCurrentUser(supabase);
        if (!currentUser) {
          return { items: [], hasMore: false };
        }

        // Get user's communities
        const userCommunities = await fetchUserCommunities(supabase, currentUser.id);
        
        if (userCommunities.length === 0) {
          return { items: [], hasMore: false };
        }

        // Extract community IDs
        const communityIds = userCommunities.map(membership => membership.communityId);

        // Fetch resources and events using single queries with communityIds arrays
        const [resources, events] = await Promise.all([
          fetchResources(supabase, { communityIds }),
          fetchEvents(supabase, { communityIds }),
        ]);

        // Transform to FeedItem format
        const resourceItems = resources.map(resource => ({
          type: 'resource' as const,
          data: resource,
        }));

        const eventItems = events.map(event => ({
          type: 'event' as const,
          data: event,
        }));

        // Combine and sort by created_at (newest first)
        const allItems = [...resourceItems, ...eventItems];
        allItems.sort((a, b) => {
          const aDate = new Date(a.data.createdAt);
          const bDate = new Date(b.data.createdAt);
          return bDate.getTime() - aDate.getTime();
        });

        logger.debug('📰 API: Successfully fetched feed data', {
          totalItems: allItems.length,
          resourceCount: resourceItems.length,
          eventCount: eventItems.length,
        });

        return {
          items: allItems,
          hasMore: false, // No pagination for MVP
        };

      } catch (error) {
        logger.error('📰 API: Error fetching feed data', { error });
        return { items: [], hasMore: false };
      }
    },
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📰 API: Error fetching feed', {
      error: query.error,
    });
  }

  return query;
}