import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys, toRecords } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchGatherings } from '../api';

import type { Gathering, GatheringFilter } from '../types';

/**
 * Hook for fetching gatherings list.
 *
 * Provides gathering listing functionality with optional filtering.
 * Supports filtering by community, organizer, date range, and other criteria.
 *
 * @param filters - Optional filters to apply to the gathering list
 * @returns Query state for gatherings list
 *
 * @example
 * ```tsx
 * function GatheringList() {
 *   const { data: gatherings, isPending, error } = useGatherings();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {gatherings?.map(gathering => (
 *         <div key={gathering.id}>
 *           <h3>{gathering.title}</h3>
 *           <p>{gathering.description}</p>
 *           <span>{gathering.startDateTime.toLocaleDateString()}</span>
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
 * function CommunityGatherings({ communityId }) {
 *   const { data: gatherings } = useGatherings({
 *     communityId,
 *     startAfter: new Date(),
 *     hasAvailableSpots: true
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Upcoming Gatherings ({gatherings?.length || 0})</h2>
 *       {gatherings?.map(gathering => (
 *         <GatheringCard key={gathering.id} gathering={gathering} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGatherings(filters?: GatheringFilter) {
  const supabase = useSupabase();

  const query = useQuery<Gathering[], Error>({
    queryKey: filters
      ? queryKeys.gatherings.filtered(toRecords(filters))
      : queryKeys.gatherings.all,
    queryFn: () => fetchGatherings(supabase, filters),
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📅 API: Error fetching gatherings', {
      error: query.error,
      filters,
    });
  }

  return query;
}