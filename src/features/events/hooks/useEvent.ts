import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { EventInfo } from '../types';

/**
 * Hook for fetching a single event by ID.
 *
 * Provides query functionality for fetching a specific community event.
 * Must be used within a BelongProvider context.
 *
 * @param eventId - The ID of the event to fetch
 * @returns React Query result for the event
 * @category React Hooks
 */
export function useEvent(eventId: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);

  const query = useQuery<EventInfo, Error>({
    queryKey: queryKeys.events.byId(eventId),
    queryFn: () => eventService.fetchEventById(eventId),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!eventId,
  });

  if (query.error) {
    logger.error('🎉 API: Error fetching event', {
      error: query.error,
      eventId,
    });
  }

  return query;
}