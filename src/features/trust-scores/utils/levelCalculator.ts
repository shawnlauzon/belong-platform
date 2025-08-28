import { PLAYER_LEVELS } from '../config/levelConfig';
import type { PlayerLevel, LevelProgress } from '../types/playerLevel';

/**
 * Calculates the player level based on trust score
 * @param score - The player's trust score
 * @returns The player's current level
 */
export function calculateLevel(score: number): PlayerLevel {
  // Handle negative or zero scores
  if (score <= 0) {
    return PLAYER_LEVELS[0];
  }

  // Find the appropriate level based on score
  for (let i = PLAYER_LEVELS.length - 1; i >= 0; i--) {
    if (score >= PLAYER_LEVELS[i].minScore) {
      return PLAYER_LEVELS[i];
    }
  }

  // Fallback to first level (should not reach here)
  return PLAYER_LEVELS[0];
}

/**
 * Calculates the progress to the next level
 * @param score - The player's trust score
 * @returns Progress information including current level, next level, and percentage
 */
export function getProgressToNextLevel(score: number): LevelProgress {
  // Ensure score is not negative for calculations
  const adjustedScore = Math.max(0, score);
  
  const currentLevel = calculateLevel(adjustedScore);
  const nextLevel = 
    currentLevel.index < PLAYER_LEVELS.length - 1 
      ? PLAYER_LEVELS[currentLevel.index + 1]
      : undefined;

  if (!nextLevel || !currentLevel.maxScore) {
    // Player is at max level
    return {
      currentLevel,
      nextLevel: undefined,
      currentScore: adjustedScore,
      progress: 100,
      pointsToNext: 0,
    };
  }

  const scoreInCurrentLevel = adjustedScore - currentLevel.minScore;
  const levelRange = currentLevel.maxScore - currentLevel.minScore;
  const progress = Math.min(100, Math.max(0, (scoreInCurrentLevel / levelRange) * 100));
  const pointsToNext = Math.max(0, currentLevel.maxScore - adjustedScore);

  return {
    currentLevel,
    nextLevel,
    currentScore: adjustedScore,
    progress,
    pointsToNext,
  };
}

/**
 * Gets a level by its index
 * @param index - The level index (0-19)
 * @returns The level at the specified index, or undefined if index is out of bounds
 */
export function getLevelByIndex(index: number): PlayerLevel | undefined {
  if (index < 0 || index >= PLAYER_LEVELS.length) {
    return undefined;
  }
  return PLAYER_LEVELS[index];
}

/**
 * Gets the total number of levels
 * @returns The total number of player levels
 */
export function getTotalLevels(): number {
  return PLAYER_LEVELS.length;
}

/**
 * Gets all player levels
 * @returns Array of all player levels
 */
export function getAllLevels(): PlayerLevel[] {
  return PLAYER_LEVELS;
}