import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  ActivitySummary,
  ActivityFilter,
  ActivitySection,
} from '../types';
import {
  transformEventsToActivities,
  transformResourcesToActivities,
  transformShoutoutsToActivities,
  transformMessagesToActivities,
} from '../transformers/activitiesTransformer';

/**
 * Fetches and aggregates user activities from multiple sources
 */
export async function fetchActivities(
  supabase: SupabaseClient<Database>,
  filter: ActivityFilter,
): Promise<ActivitySummary[]> {
  logger.debug('📊 API: Fetching activities', { filter });

  try {
    // Parallel fetch from all sources
    const [eventsResult, resourcesResult, shoutoutsResult, messagesResult] =
      await Promise.all([
        fetchUserEvents(supabase, filter.userId, filter.communityIds),
        fetchUserResources(supabase, filter.userId, filter.communityIds),
        fetchPendingShoutouts(supabase, filter.userId, filter.communityIds),
        fetchUnreadMessages(supabase, filter.userId),
      ]);

    // Transform each data type to activities
    const eventActivities = transformEventsToActivities(
      eventsResult.data || [],
    );
    const resourceActivities = transformResourcesToActivities(
      resourcesResult.data || [],
    );
    const shoutoutActivities = transformShoutoutsToActivities(
      shoutoutsResult.data || [],
    );
    const messageActivities = transformMessagesToActivities(
      messagesResult.data || [],
    );

    // Combine all activities
    let activities = [
      ...eventActivities,
      ...resourceActivities,
      ...shoutoutActivities,
      ...messageActivities,
    ];

    // Filter by section if specified
    if (filter.section) {
      activities = filterBySection(activities, filter.section);
    }

    // Sort by urgency and date
    activities.sort((a, b) => {
      // Sort by urgency first
      const urgencyOrder: { [key: string]: number } = {
        urgent: 0,
        soon: 1,
        normal: 2,
      };
      const urgencyDiff =
        urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Then by due date (if available)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // Finally by created date
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Apply limit if specified
    if (filter.limit) {
      activities = activities.slice(0, filter.limit);
    }

    logger.info('📊 API: Successfully fetched activities', {
      count: activities.length,
      userId: filter.userId,
    });

    return activities;
  } catch (error) {
    logger.error('📊 API: Error fetching activities', { error, filter });
    throw error;
  }
}

/**
 * Fetch user's event attendances
 */
async function fetchUserEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
  communityIds?: string[],
) {
  let query = supabase
    .from('gathering_responses')
    .select(
      `
      *,
      event:gatherings(
        *,
        community:communities(id, name),
        organizer:profiles(id, email, user_metadata)
      )
    `,
    )
    .eq('user_id', userId)
    .in('status', ['attending', 'maybe']);

  if (communityIds && communityIds.length > 0) {
    query = query.in('event.community_id', communityIds);
  }

  return query;
}

/**
 * Fetch user's resource responses
 */
async function fetchUserResources(
  supabase: SupabaseClient<Database>,
  userId: string,
  communityIds?: string[],
) {
  let query = supabase
    .from('resource_responses')
    .select(
      `
      *,
      resource:resources(
        *,
        community:communities(id, name),
        owner:profiles(id, email, user_metadata)
      )
    `,
    )
    .eq('user_id', userId);

  if (communityIds && communityIds.length > 0) {
    query = query.in('resource.community_id', communityIds);
  }

  return query;
}

/**
 * Fetch pending shoutouts (where user needs to give a shoutout)
 */
async function fetchPendingShoutouts(
  supabase: SupabaseClient<Database>,
  userId: string,
  communityIds?: string[],
) {
  // For MVP, we'll check resource responses that are completed but don't have shoutouts
  let query = supabase
    .from('resource_responses')
    .select(
      `
      *,
      resource:resources!inner(
        *,
        community:communities(id, name),
        owner:profiles(id, email, user_metadata)
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('resource.owner_id', 'eq', userId); // Don't show shoutouts for own resources

  if (communityIds && communityIds.length > 0) {
    query = query.in('resource.community_id', communityIds);
  }

  // Check which ones already have shoutouts
  const { data } = await query;
  if (!data || data.length === 0) return { data: [] };

  // Get existing shoutouts for these resources
  const resourceIds = data.map((r) => r.resource_id);
  const { data: existingShoutouts } = await supabase
    .from('shoutouts')
    .select('resource_id')
    .eq('from_user_id', userId)
    .in('resource_id', resourceIds);

  const shoutoutResourceIds = new Set(
    existingShoutouts?.map((s) => s.resource_id) || [],
  );

  // Filter out resources that already have shoutouts
  const pendingShoutouts = data.filter(
    (r) => !shoutoutResourceIds.has(r.resource_id),
  );

  return { data: pendingShoutouts };
}

/**
 * Fetch unread direct messages
 */
async function fetchUnreadMessages(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return supabase
    .from('direct_messages')
    .select(
      `
      *,
      conversation:conversations(id),
      from_user:profiles!direct_messages_from_user_id_fkey(id, email, user_metadata)
    `,
    )
    .eq('to_user_id', userId)
    .is('read_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

/**
 * Filter activities by section
 */
function filterBySection(
  activities: ActivitySummary[],
  section: ActivitySection,
): ActivitySummary[] {
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (section) {
    case 'attention':
      return activities.filter(
        (a) =>
          a.urgencyLevel === 'urgent' ||
          (a.dueDate && a.dueDate < now && a.type !== 'event_upcoming'),
      );

    case 'in_progress':
      return activities.filter(
        (a) =>
          a.type === 'resource_accepted' ||
          (a.type === 'event_upcoming' &&
            a.dueDate &&
            a.dueDate >= now &&
            a.dueDate <= oneDayFromNow),
      );

    case 'upcoming':
      return activities.filter(
        (a) =>
          a.type === 'event_upcoming' && a.dueDate && a.dueDate > oneDayFromNow,
      );

    case 'history':
      return activities.filter(
        (a) =>
          a.createdAt >= sevenDaysAgo &&
          ((a.type === 'event_upcoming' && a.dueDate && a.dueDate < now) ||
            (a.type === 'resource_accepted' &&
              a.metadata.status === 'completed')),
      );

    default:
      return activities;
  }
}
