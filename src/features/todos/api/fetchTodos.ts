import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  TodoSummary,
  TodoFilter,
  TodoSection,
} from '../types';
import {
  transformEventsToTodos,
  transformResourcesToTodos,
  transformShoutoutsToTodos,
  transformMessagesToTodos,
} from '../transformers/todosTransformer';

/**
 * Fetches and aggregates user todos from multiple sources
 */
export async function fetchTodos(
  supabase: SupabaseClient<Database>,
  filter: TodoFilter,
): Promise<TodoSummary[]> {
  logger.debug('📊 API: Fetching todos', { filter });

  try {
    // Parallel fetch from all sources
    const [eventsResult, resourcesResult, shoutoutsResult, messagesResult] =
      await Promise.all([
        fetchUserEvents(supabase, filter.userId, filter.communityIds),
        fetchUserResources(supabase, filter.userId, filter.communityIds),
        fetchPendingShoutouts(supabase, filter.userId, filter.communityIds),
        fetchUnreadMessages(supabase, filter.userId),
      ]);

    // Transform each data type to todos
    const eventTodos = transformEventsToTodos(
      eventsResult.data || [],
    );
    const resourceTodos = transformResourcesToTodos(
      resourcesResult.data || [],
    );
    const shoutoutTodos = transformShoutoutsToTodos(
      shoutoutsResult.data || [],
    );
    const messageTodos = transformMessagesToTodos(
      messagesResult.data || [],
    );

    // Combine all todos
    let todos = [
      ...eventTodos,
      ...resourceTodos,
      ...shoutoutTodos,
      ...messageTodos,
    ];

    // Filter by section if specified
    if (filter.section) {
      todos = filterBySection(todos, filter.section);
    }

    // Sort by urgency and date
    todos.sort((a, b) => {
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
      todos = todos.slice(0, filter.limit);
    }

    logger.info('📊 API: Successfully fetched todos', {
      count: todos.length,
      userId: filter.userId,
    });

    return todos;
  } catch (error) {
    logger.error('📊 API: Error fetching todos', { error, filter });
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
 * Filter todos by section
 */
function filterBySection(
  todos: TodoSummary[],
  section: TodoSection,
): TodoSummary[] {
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (section) {
    case 'attention':
      return todos.filter(
        (a) =>
          a.urgencyLevel === 'urgent' ||
          (a.dueDate && a.dueDate < now && a.type !== 'event_upcoming'),
      );

    case 'in_progress':
      return todos.filter(
        (a) =>
          a.type === 'resource_accepted' ||
          (a.type === 'event_upcoming' &&
            a.dueDate &&
            a.dueDate >= now &&
            a.dueDate <= oneDayFromNow),
      );

    case 'upcoming':
      return todos.filter(
        (a) =>
          a.type === 'event_upcoming' && a.dueDate && a.dueDate > oneDayFromNow,
      );

    case 'history':
      return todos.filter(
        (a) =>
          a.createdAt >= sevenDaysAgo &&
          ((a.type === 'event_upcoming' && a.dueDate && a.dueDate < now) ||
            (a.type === 'resource_accepted' &&
              a.metadata.status === 'completed')),
      );

    default:
      return todos;
  }
}
