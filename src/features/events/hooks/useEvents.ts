import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { EventInfo, EventFilter } from '../types';

/**
 * Hook for fetching a list of events.
 *
 * Provides query functionality for fetching community events with optional filtering.
 * Must be used within a BelongProvider context.
 *
 * @param filters - Optional filters to apply to the events query
 * @returns React Query result for events
 * @category React Hooks
 */
export function useEvents(filters?: EventFilter) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const query = useQuery<EventInfo[], Error>({
    queryKey: filters 
      ? queryKeys.events.filtered(filters)
      : queryKeys.events.all,
    queryFn: () => eventService.fetchEvents(filters),
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('🎉 API: Error fetching events', {
      error: query.error,
      filters,
    });
  }

  return query;
}