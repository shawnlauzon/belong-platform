import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import type { Event } from '@/features/events/types';
import { fetchAndCacheEvent } from '../api/fetchAndCacheEvent';

/**
 * Hook for fetching a single event by ID.
 *
 * Provides detailed event information including organizer and community data.
 *
 * @param id - The event ID to fetch
 * @returns Query state for the event
 *
 * @example
 * ```tsx
 * function EventDetail({ eventId }) {
 *   const { data: event, isPending, error } = useEvent(eventId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!event) return <div>Event not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{event.title}</h1>
 *       <p>{event.description}</p>
 *       <div>
 *         <span>Start: {event.startDateTime.toLocaleString()}</span>
 *         {event.endDateTime && <span>End: {event.endDateTime.toLocaleString()}</span>}
 *       </div>
 *       <div>
 *         <span>Location: {event.location}</span>
 *         <span>Attendees: {event.attendeeCount}/{event.maxAttendees || '∞'}</span>
 *       </div>
 *       <div>
 *         <span>Organized by: {event.organizer.firstName} {event.organizer.lastName}</span>
 *         <span>Community: {event.community.name}</span>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEvent(id: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useQuery<Event | null, Error>({
    queryKey: queryKeys.events.byId(id),
    queryFn: () => fetchAndCacheEvent(supabase, queryClient, id),
    enabled: !!id,
  });
}