import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { fetchUserCommunities } from '../../communities/api';
import { fetchResources } from '../../resources/api';
import { fetchShoutouts } from '../../shoutouts/api';
import { getCurrentUser } from '../../auth/api';
import { Feed, FeedItem } from '../types';
import { logger } from '@/shared';

export async function fetchFeed(
  supabase: SupabaseClient<Database>,
): Promise<Feed> {
  logger.debug('📰 API: Fetching feed data');

  try {
    // Get current user first
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get user's communities
    const userCommunities = await fetchUserCommunities(
      supabase,
      currentUser.id,
    );

    if (userCommunities.length === 0) {
      return { items: [], hasMore: false };
    }

    // Extract community IDs
    const communityIds = userCommunities.map(
      (membership) => membership.communityId,
    );

    // Fetch resources and shoutouts using single queries with communityIds arrays
    const [resources, shoutouts] = await Promise.all([
      fetchResources(supabase, {
        communityIds,
      }),
      fetchShoutouts(supabase, { communityIds }),
    ]);

    // Transform to FeedItem format
    const resourceItems: FeedItem[] = resources.map((resource) => ({
      id: resource.id,
      type: 'resource',
      data: resource,
    }));

    const shoutoutItems: FeedItem[] = shoutouts.map((shoutout) => ({
      id: shoutout.id,
      type: 'shoutout',
      data: shoutout,
    }));

    // Combine and sort by created_at (newest first)
    const allItems = [...resourceItems, ...shoutoutItems];
    allItems.sort((a, b) => {
      const aDate = new Date(a.data.createdAt);
      const bDate = new Date(b.data.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    logger.debug('📰 API: Successfully fetched feed data', {
      totalItems: allItems.length,
      resourceCount: resourceItems.length,
      shoutoutCount: shoutoutItems.length,
    });

    return {
      items: allItems,
      hasMore: false, // No pagination for MVP
    };
  } catch (error) {
    logger.error('📰 API: Error fetching feed data', { error });
    throw error;
  }
}
