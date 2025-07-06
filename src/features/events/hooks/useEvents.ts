import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys, toRecords } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchEvents } from '@/features/events/api';

import type { EventInfo, EventFilter } from '@/features/events/types';

/**
 * Hook for fetching events list.
 *
 * Provides event listing functionality with optional filtering.
 * Supports filtering by community, organizer, date range, and other criteria.
 *
 * @param filters - Optional filters to apply to the event list
 * @returns Query state for events list
 *
 * @example
 * ```tsx
 * function EventList() {
 *   const { data: events, isPending, error } = useEvents();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {events?.map(event => (
 *         <div key={event.id}>
 *           <h3>{event.title}</h3>
 *           <p>{event.description}</p>
 *           <span>{event.startDateTime.toLocaleDateString()}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With filters
 * function CommunityEvents({ communityId }) {
 *   const { data: events } = useEvents({
 *     communityId,
 *     startAfter: new Date(),
 *     hasAvailableSpots: true
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Upcoming Events ({events?.length || 0})</h2>
 *       {events?.map(event => (
 *         <EventCard key={event.id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEvents(filters?: EventFilter) {
  const supabase = useSupabase();

  const query = useQuery<EventInfo[], Error>({
    queryKey: filters
      ? queryKeys.events.filtered(toRecords(filters))
      : queryKeys.events.all,
    queryFn: () => fetchEvents(supabase, filters),
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📅 API: Error fetching events', {
      error: query.error,
      filters,
    });
  }

  return query;
}