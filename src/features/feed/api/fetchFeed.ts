import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { fetchUserCommunities } from '../../communities/api';
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

    // Fetch resource IDs, creation dates, and category for sorting and categorization
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .select('id, created_at, category, resource_communities!inner(community_id)')
      .in('resource_communities.community_id', communityIds);

    if (resourceError) {
      throw resourceError;
    }

    // Fetch shoutout IDs and creation dates for sorting
    const { data: shoutoutData, error: shoutoutError } = await supabase
      .from('shoutouts')
      .select('id, created_at')
      .in('community_id', communityIds);

    if (shoutoutError) {
      throw shoutoutError;
    }

    // Combine items with their creation dates for sorting
    const itemsWithDates = [
      ...(resourceData || []).map(r => ({ 
        id: r.id, 
        type: r.category === 'event' ? 'event' as const : 'resource' as const, 
        createdAt: r.created_at 
      })),
      ...(shoutoutData || []).map(s => ({ id: s.id, type: 'shoutout' as const, createdAt: s.created_at }))
    ];

    // Sort by created_at (newest first)
    itemsWithDates.sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    // Convert to final FeedItem format (without createdAt)
    const allItems: FeedItem[] = itemsWithDates.map(({ id, type }) => ({ id, type }));

    logger.debug('📰 API: Successfully fetched feed data', {
      totalItems: allItems.length,
      resourceCount: resourceData?.filter(r => r.category !== 'event').length || 0,
      eventCount: resourceData?.filter(r => r.category === 'event').length || 0,
      shoutoutCount: shoutoutData?.length || 0,
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
