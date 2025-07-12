import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchGatheringInfoById } from '../api';

/**
 * Hook for fetching a single gathering by ID.
 *
 * Provides detailed gathering information including organizer and community data.
 *
 * @param id - The gathering ID to fetch
 * @returns Query state for the gathering
 *
 * @example
 * ```tsx
 * function GatheringDetail({ gatheringId }) {
 *   const { data: gathering, isPending, error } = useGathering(gatheringId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!gathering) return <div>Gathering not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{gathering.title}</h1>
 *       <p>{gathering.description}</p>
 *       <div>
 *         <span>Start: {gathering.startDateTime.toLocaleString()}</span>
 *         {gathering.endDateTime && <span>End: {gathering.endDateTime.toLocaleString()}</span>}
 *       </div>
 *       <div>
 *         <span>Location: {gathering.locationName}</span>
 *         <span>Attendees: {gathering.attendeeCount}/{gathering.maxAttendees || '∞'}</span>
 *       </div>
 *       <div>
 *         <span>Organized by: {gathering.organizer.firstName} {gathering.organizer.lastName}</span>
 *         <span>Community: {gathering.community.name}</span>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGathering(id: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.gatherings.byId(id),
    queryFn: () => fetchGatheringInfoById(supabase, id),
    enabled: !!id,
  });
}