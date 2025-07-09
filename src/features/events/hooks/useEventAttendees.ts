import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchEventAttendees } from '@/features/events/api/fetchEventAttendees';

import type { EventAttendanceInfo } from '@/features/events/types';

/**
 * Hook for fetching event attendees.
 *
 * Provides a list of event attendances with user data and attendance status.
 *
 * @param eventId - The event ID to fetch attendees for
 * @returns Query state for event attendances
 *
 * @example
 * ```tsx
 * function EventAttendees({ eventId }) {
 *   const { data: attendances, isPending, error } = useEventAttendees(eventId);
 *
 *   if (isPending) return <div>Loading attendees...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <h3>Attendees ({attendances?.length || 0})</h3>
 *       {attendances?.map(attendance => (
 *         <div key={attendance.userId}>
 *           <span>{attendance.user?.firstName} {attendance.user?.lastName}</span>
 *           <span>@{attendance.user?.username}</span>
 *           <span>Status: {attendance.status}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventAttendees(eventId: string) {
  const supabase = useSupabase();

  const query = useQuery<EventAttendanceInfo[], Error>({
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
