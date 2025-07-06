import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchEventAttendees } from '@/features/events/api/fetchEventAttendees';

import type { User } from '@/features/users';

/**
 * Hook for fetching event attendees.
 *
 * Provides a list of users who are attending an event.
 *
 * @param eventId - The event ID to fetch attendees for
 * @returns Query state for event attendees
 *
 * @example
 * ```tsx
 * function EventAttendees({ eventId }) {
 *   const { data: attendees, isPending, error } = useEventAttendees(eventId);
 *
 *   if (isPending) return <div>Loading attendees...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h3>Attendees ({attendees?.length || 0})</h3>
 *       {attendees?.map(user => (
 *         <div key={user.id}>
 *           <span>{user.firstName} {user.lastName}</span>
 *           <span>@{user.username}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventAttendees(eventId: string) {
  const supabase = useSupabase();

  const query = useQuery<User[], Error>({
    queryKey: queryKeys.events.attendees(eventId),
    queryFn: () => fetchEventAttendees(supabase, eventId),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!eventId,
  });

  if (query.error) {
    logger.error('📅 API: Error fetching event attendees', {
      error: query.error,
      eventId,
    });
  }

  return query;
}