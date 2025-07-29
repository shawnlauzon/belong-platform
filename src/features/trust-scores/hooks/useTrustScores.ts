import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchTrustScores } from '../api';
import { STANDARD_CACHE_TIME } from '@/config';
import type { TrustScore } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';
import { trustScoreKeys } from '../queries';

/**
 * Hook for fetching multiple trust scores based on filter criteria.
 *
 * This hook provides functionality for retrieving trust scores across
 * multiple communities or users. Commonly used to get all trust scores
 * for a specific user across all their communities. Must be used within
 * a BelongProvider context.
 *
 * @param filter - Filter criteria for the trust scores
 * @returns React Query result with trust scores array and query state
 *
 * @example
 * ```tsx
 * // Get all trust scores for a user
 * function UserTrustScores({ userId }: { userId: string }) {
 *   const { data: trustScores, isPending, isError } = useTrustScores({ userId });
 *
 *   if (isPending) return <div>Loading trust scores...</div>;
 *   if (isError) return <div>Error loading trust scores</div>;
 *   if (!trustScores?.length) return <div>No trust scores yet</div>;
 *
 *   return (
 *     <div>
 *       <h3>Trust Scores</h3>
 *       {trustScores.map((score) => (
 *         <div key={score.id}>
 *           Community {score.communityId}: {score.score} points
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get trust scores for specific communities
 * function CommunityTrustScores({ userId, communityIds }: {
 *   userId: string;
 *   communityIds: string[]
 * }) {
 *   const { data: trustScores } = useTrustScores({ userId, communityIds });
 *
 *   return (
 *     <div>
 *       {trustScores?.map((score) => (
 *         <div key={score.id}>
 *           {score.score} points in community {score.communityId}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 *
 * @category React Hooks
 */
export function useTrustScores(
  userId: string,
  options?: Partial<UseQueryOptions<TrustScore[], Error>>,
): UseQueryResult<TrustScore[], Error> {
  const supabase = useSupabase();

  const query = useQuery<TrustScore[], Error>({
    queryKey: trustScoreKeys.listByUser(userId),
    queryFn: async () => {
      const rows = await fetchTrustScores(supabase, userId);

      logger.info('🏆 API: Fetched trust scores', {
        userId,
        count: rows.length,
      });

      return rows;
    },
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🏆 API: Error fetching trust scores', {
      error: query.error,
      userId,
    });
  }

  return query;
}
