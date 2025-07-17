import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow } from '@/shared/utils';
import type { Agenda, Todo } from '../types';
import {
  fetchOffersNeedingShoutout,
  fetchFavorsNeedingShoutout,
} from '../../resources/api';
import { fetchMyResourcesWithPendingClaims } from '../../resources/api/fetchMyResourcesWithPendingClaims';
import { fetchMyResourcesWithAcceptedClaims } from '../../resources/api/fetchMyResourcesWithAcceptedClaims';
import { fetchMyAcceptedClaims } from '../../resources/api/fetchMyAcceptedClaims';
import { fetchMyActiveResources } from '../../resources/api/fetchMyActiveResources';
import { fetchMyResourcesImInterestedIn } from '../../resources/api/fetchMyResourcesImInterestedIn';
import { fetchMyResourcesImConfirmedFor } from '../../resources/api/fetchMyResourcesImConfirmedFor';
import { fetchMyResourcesImOrganizing } from '../../resources/api/fetchMyResourcesImOrganizing';

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
      myResourcesWithPendingClaims,
      myResourcesWithAcceptedClaims,
      myAcceptedClaims,
      myActiveResources,
      myResourcesImInterestedIn,
      myResourcesImConfirmedFor,
      myResourcesImOrganizing,
    ] = await Promise.all([
      fetchOffersNeedingShoutout(supabase),
      fetchFavorsNeedingShoutout(supabase),
      fetchMyResourcesWithPendingClaims(supabase),
      fetchMyResourcesWithAcceptedClaims(supabase),
      fetchMyAcceptedClaims(supabase),
      fetchMyActiveResources(supabase),
      fetchMyResourcesImInterestedIn(supabase),
      fetchMyResourcesImConfirmedFor(supabase),
      fetchMyResourcesImOrganizing(supabase),
    ]);

    // Transform each data source into Todo items
    const todos: Todo[] = [
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
        id: `shoutout-request-${resource.id}`,
        type: 'shoutout-request' as const,
        title: `Thank the person who helped with: "${resource.title}"`,
        description: `Send a shoutout for accepting this request`,
        resource,
      })),

      // Resources with pending claims needing review
      ...myResourcesWithPendingClaims.map((resource) => ({
        id: `pending-claims-${resource.id}`,
        type: 'my-resource-pending-claims' as const,
        title: `Review pending claims for: "${resource.title}"`,
        description: `Approve or reject claims on your ${resource.type}`,
        resource,
      })),

      // Resources with accepted claims ready to fulfill
      ...myResourcesWithAcceptedClaims.map((resource) => ({
        id: `ready-to-fulfill-${resource.id}`,
        type: 'my-resource-ready-to-fulfill' as const,
        title: `Fulfill "${resource.title}"`,
        description: `Complete the accepted claims on your ${resource.type}`,
        resource,
      })),

      // My accepted claims ready to complete
      ...myAcceptedClaims.map((resource) => ({
        id: `ready-to-complete-${resource.id}`,
        type: 'my-claim-ready-to-complete' as const,
        title: `Complete "${resource.title}"`,
        description: `Follow through on your accepted claim for this ${resource.type}`,
        resource,
      })),

      // My active resources needing management
      ...myActiveResources.map((resource) => ({
        id: `active-resource-${resource.id}`,
        type: 'my-resource-active' as const,
        title: `Manage "${resource.title}"`,
        description: `Keep track of your active ${resource.type}`,
        resource,
      })),

      // Resources I'm interested in
      ...myResourcesImInterestedIn.map((resource) => ({
        id: `interested-${resource.id}`,
        type: 'my-claim-interested' as const,
        title: `Interested in "${resource.title}"`,
        description: `You've expressed interest - waiting for confirmation`,
        resource,
      })),

      // Resources I'm confirmed for
      ...myResourcesImConfirmedFor.map((resource) => ({
        id: `confirmed-${resource.id}`,
        type: 'my-claim-confirmed' as const,
        title: `Attend "${resource.title}"`,
        description: `You're confirmed to participate in this ${resource.type}`,
        resource,
      })),

      // Events I'm organizing
      ...myResourcesImOrganizing.map((resource) => ({
        id: `organizing-${resource.id}`,
        type: 'my-resource-organizing' as const,
        title: `Organize "${resource.title}"`,
        description: `Manage your upcoming event`,
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
