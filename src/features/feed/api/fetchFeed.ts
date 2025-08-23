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
    // Also fetch timeslots for events to filter out past events
    // Include fields needed for expiration checking
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .select(`
        id, 
        type, 
        created_at,
        last_renewed_at,
        resource_communities!inner(community_id),
        resource_timeslots(start_time, end_time),
        is_active
      `)
      .eq('status', 'open')
      .in('resource_communities.community_id', communityIds);

    if (resourceError) {
      throw resourceError;
    }

    // Filter out expired resources and past events
    const now = new Date();
    const filteredResources = resourceData?.filter((resource) => {
      // First check: Filter out expired resources (inactive according to renewal rules)
      if (!resource.is_active) {
        return false;
      }

      // Second check: For events, filter out past events (events where all timeslots have ended)
      if (resource.type === 'event') {
        const timeslots = resource.resource_timeslots || [];
        
        // If no timeslots, include the event (shouldn't happen but be safe)
        if (timeslots.length === 0) {
          return true;
        }

        // Keep event if at least one timeslot hasn't ended yet
        return timeslots.some((slot) => {
          const endTime = new Date(slot.end_time);
          return endTime >= now;
        });
      }

      // Non-event resources that are active pass through
      return true;
    }) || [];

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
      ...(filteredResources || []).map((r) => ({
        id: r.id,
        type: r.type === 'event' ? ('event' as const) : ('resource' as const),
        createdAt: r.created_at,
      })),
      ...(shoutoutData || []).map((s) => ({
        id: s.id,
        type: 'shoutout' as const,
        createdAt: s.created_at,
      })),
    ];

    // Sort by created_at (newest first)
    itemsWithDates.sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    // Convert to final FeedItem format (without createdAt)
    const allItems: FeedItem[] = itemsWithDates.map(({ id, type }) => ({
      id,
      type,
    }));

    logger.debug('📰 API: Successfully fetched feed data', {
      totalItems: allItems.length,
      resourceCount:
        filteredResources?.filter((r) => r.type !== 'event').length || 0,
      eventCount: filteredResources?.filter((r) => r.type === 'event').length || 0,
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
