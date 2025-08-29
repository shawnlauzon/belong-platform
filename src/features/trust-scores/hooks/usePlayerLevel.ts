import { useMemo } from 'react';
import { useTrustScores } from './useTrustScores';
import { getProgressToNextLevel } from '../utils/levelCalculator';
import type { LevelProgress } from '../types/playerLevel';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { TrustScore } from '../types';

export interface UsePlayerLevelParams {
  userId: string;
  communityId?: string;
}

export interface UsePlayerLevelResult {
  data: LevelProgress | null;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
}

/**
 * Hook for calculating and fetching a player's level based on trust scores.
 *
 * This hook provides player level information derived from trust scores,
 * including the current level, progress to next level, and associated metadata.
 * Can calculate levels for a specific community or the highest level across all communities.
 *
 * @param params - Query parameters containing userId and optional communityId
 * @param options - Optional React Query options for customizing the query behavior
 * @returns Level progress information with loading states
 *
 * @example
 * ```tsx
 * // Get highest player level across all communities
 * function PlayerLevelDisplay({ userId }: { userId: string }) {
 *   const { data: levelProgress, isPending } = usePlayerLevel({ userId });
 *
 *   if (isPending) return <div>Loading level...</div>;
 *   if (!levelProgress) return null;
 *
 *   return (
 *     <div>
 *       <span>{levelProgress.currentLevel.emoji}</span>
 *       <span>{levelProgress.currentLevel.name}</span>
 *       <div>Level {levelProgress.currentLevel.index + 1}/20</div>
 *       <div>Progress: {levelProgress.progress.toFixed(0)}%</div>
 *       {levelProgress.pointsToNext && (
 *         <div>{levelProgress.pointsToNext} points to next level</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get level for specific community
 * function CommunityPlayerLevel({ userId, communityId }: {
 *   userId: string;
 *   communityId: string;
 * }) {
 *   const { data: levelProgress } = usePlayerLevel({ userId, communityId });
 *
 *   if (!levelProgress) return null;
 *
 *   return (
 *     <div>
 *       {levelProgress.currentLevel.emoji} {levelProgress.currentLevel.name}
 *       <div>Community Level: {levelProgress.currentLevel.index + 1}</div>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get level with custom query options
 * function PlayerLevelWithOptions({ userId }: { userId: string }) {
 *   const { data: levelProgress } = usePlayerLevel({ userId }, {
 *     staleTime: 60000, // Cache for 1 minute
 *     enabled: true     // Enable query
 *   });
 *
 *   return levelProgress ? (
 *     <div>{levelProgress.currentLevel.emoji} Level {levelProgress.currentLevel.index + 1}</div>
 *   ) : null;
 * }
 * ```
 *
 * @category React Hooks
 */
export function usePlayerLevel(
  params: UsePlayerLevelParams,
  options?: Partial<UseQueryOptions<TrustScore[], Error>>
): UsePlayerLevelResult {
  const { userId, communityId } = params;
  const trustScoresQuery = useTrustScores(userId, options);

  const levelProgress = useMemo(() => {
    if (!trustScoresQuery.data) {
      return null;
    }

    let totalScore = 0;

    if (communityId) {
      // Get score for specific community
      const communityScore = trustScoresQuery.data.find(
        score => score.communityId === communityId
      );
      totalScore = communityScore?.score || 0;
    } else {
      // Get highest score from any community
      totalScore = trustScoresQuery.data.reduce(
        (max, score) => Math.max(max, score.score),
        0
      );
    }

    return getProgressToNextLevel(totalScore);
  }, [trustScoresQuery.data, communityId]);

  // Return level data with query states
  return {
    data: levelProgress,
    error: trustScoresQuery.error,
    isError: trustScoresQuery.isError,
    isPending: trustScoresQuery.isPending,
    isLoading: trustScoresQuery.isLoading,
    isSuccess: trustScoresQuery.isSuccess,
    isRefetching: trustScoresQuery.isRefetching,
  };
}