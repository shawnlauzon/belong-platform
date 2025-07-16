import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow } from '@/shared/utils';
import type { Agenda, Todo } from '../types';
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
    await getAuthIdOrThrow(supabase, 'fetch agenda');

    // Fetch all agenda data in parallel from different domain APIs
    const [
      offersNeedingShoutout,
      favorsNeedingShoutout,
    ] = await Promise.all([
      fetchOffersNeedingShoutout(supabase),
      fetchFavorsNeedingShoutout(supabase),
    ]);

    // Transform each data source into Todo items
    const todos: Todo[] = [
      // Offer shoutouts (accepted offers needing thank you)
      ...offersNeedingShoutout.map((resource) => ({
        id: resource.id,
        type: 'shoutout-offer' as const,
        title: `Thank ${resource.owner.firstName} for their offer: "${resource.title}"`,
        description: `Send a shoutout for accepting this offer`,
        resource,
      })),

      // Favor shoutouts (accepted favors needing thank you)
      ...favorsNeedingShoutout.map((resource) => ({
        id: resource.id,
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
