import { useMemo } from 'react';
import { useTrustScores } from './useTrustScores';
import { getProgressToNextLevel } from '../utils/levelCalculator';
import type { LevelProgress } from '../types/playerLevel';

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
 * Can calculate levels for a specific community or across all communities.
 *
 * @param userId - The user's ID
 * @param communityId - Optional community ID to get level for specific community
 * @returns Level progress information with loading states
 *
 * @example
 * ```tsx
 * // Get overall player level across all communities
 * function PlayerLevelDisplay({ userId }: { userId: string }) {
 *   const { data: levelProgress, isPending } = usePlayerLevel(userId);
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
 *   const { data: levelProgress } = usePlayerLevel(userId, communityId);
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
 * @category React Hooks
 */
export function usePlayerLevel(
  userId: string,
  communityId?: string
): UsePlayerLevelResult {
  const trustScoresQuery = useTrustScores(userId);

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
      // Sum all community scores for overall level
      totalScore = trustScoresQuery.data.reduce(
        (sum, score) => sum + score.score,
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