import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchGatheringAttendees } from '../api';

import type { GatheringResponse } from '../types';

/**
 * Hook for fetching gathering attendees.
 *
 * Provides a list of gathering attendances with user data and attendance status.
 *
 * @param gatheringId - The gathering ID to fetch attendees for
 * @returns Query state for gathering attendances
 *
 * @example
 * ```tsx
 * function GatheringAttendees({ gatheringId }) {
 *   const { data: attendances, isPending, error } = useGatheringAttendees(gatheringId);
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
export function useGatheringAttendees(gatheringId: string) {
  const supabase = useSupabase();

  const query = useQuery<GatheringResponse[], Error>({
    queryKey: queryKeys.gatherings.attendees(gatheringId),
    queryFn: () => fetchGatheringAttendees(supabase, gatheringId),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!gatheringId,
  });

  if (query.error) {
    logger.error('📅 API: Error fetching gathering attendees', {
      error: query.error,
      gatheringId,
    });
  }

  return query;
}