import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow } from '@/shared/utils';
import type { Agenda, Todo } from '../types';
import {
  fetchUpcomingGatheringsForUser,
  fetchUpcomingOrganizerGatherings,
  fetchGatheringsNeedingShoutout,
} from '../../gatherings/api';
import {
  fetchOffersNeedingShoutout,
  fetchFavorsNeedingShoutout,
} from '../../resources/api';

/**
 * Fetches and aggregates user agenda from multiple sources
 */
export async function fetchAgenda(
  supabase: SupabaseClient<Database>,
): Promise<Agenda> {
  logger.debug('📊 API: Fetching agenda');

  try {
    const currentUserId = await getAuthIdOrThrow(supabase, 'fetch agenda');

    // Fetch all agenda data in parallel from different domain APIs
    const [
      upcomingGatherings,
      maybeGatherings, // Will be filtered from upcomingGatherings
      organizerGatherings,
      gatheringsNeedingShoutout,
      offersNeedingShoutout,
      favorsNeedingShoutout,
    ] = await Promise.all([
      fetchUpcomingGatheringsForUser(supabase, currentUserId, 'attending'),
      fetchUpcomingGatheringsForUser(supabase, currentUserId, 'maybe'),
      fetchUpcomingOrganizerGatherings(supabase, currentUserId),
      fetchGatheringsNeedingShoutout(supabase),
      fetchOffersNeedingShoutout(supabase),
      fetchFavorsNeedingShoutout(supabase),
    ]);

    // Transform each data source into Todo items
    const todos: Todo[] = [
      // Upcoming confirmed gatherings (user said yes)
      ...upcomingGatherings.map((gathering) => ({
        id: `gathering-yes-${gathering.id}`,
        type: 'gathering-confirmed' as const,
        title: gathering.title,
        description: `You're attending this gathering`,
        dueDate: gathering.startDateTime,
        gathering,
      })),

      // Upcoming maybe gatherings (user said maybe)
      ...maybeGatherings.map((gathering) => ({
        id: `gathering-maybe-${gathering.id}`,
        type: 'gathering-maybe' as const,
        title: gathering.title,
        description: `You might attend this gathering - confirm your attendance`,
        dueDate: gathering.startDateTime,
        gathering,
      })),

      // My future gatherings (user is organizer)
      ...organizerGatherings.map((gathering) => ({
        id: `gathering-organizer-${gathering.id}`,
        type: 'gathering-organizer' as const,
        title: gathering.title,
        description: `You're organizing this gathering`,
        dueDate: gathering.startDateTime,
        gathering,
      })),

      // Gathering shoutouts (attended gatherings needing thank you)
      ...gatheringsNeedingShoutout.map((gathering) => ({
        id: `shoutout-gathering-${gathering.id}`,
        type: 'shoutout-gathering' as const,
        title: `Thank ${gathering.organizer.firstName} for organizing "${gathering.title}"`,
        description: `Send a shoutout for attending this gathering`,
        gathering,
      })),

      // Offer shoutouts (accepted offers needing thank you)
      ...offersNeedingShoutout.map((resource) => ({
        id: `shoutout-offer-${resource.id}`,
        type: 'shoutout-offer' as const,
        title: `Thank ${resource.owner.firstName} for their offer: "${resource.title}"`,
        description: `Send a shoutout for accepting this offer`,
        resource,
      })),

      // Favor shoutouts (accepted favors needing thank you)
      ...favorsNeedingShoutout.map((resource) => ({
        id: `shoutout-favor-${resource.id}`,
        type: 'shoutout-favor' as const,
        title: `Thank ${resource.owner.firstName} for helping with: "${resource.title}"`,
        description: `Send a shoutout for accepting this favor request`,
        resource,
      })),
    ];

    todos.sort((a, b) => {
      // Items with due dates come first
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      return 0;
    });

    logger.info('📊 API: Successfully fetched agenda', {
      count: todos.length,
      types: todos.reduce(
        (acc, todo) => {
          acc[todo.type] = (acc[todo.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });

    return {
      items: todos,
      hasMore: false, // No pagination for MVP
    };
  } catch (error) {
    logger.error('📊 API: Error fetching agenda', { error });
    throw error;
  }
}
