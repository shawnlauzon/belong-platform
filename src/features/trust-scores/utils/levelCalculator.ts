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

  // Find the highest level where score >= pointsNeeded
  for (let i = PLAYER_LEVELS.length - 1; i >= 0; i--) {
    if (score >= PLAYER_LEVELS[i].pointsNeeded) {
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

  // Find next level (level number is currentLevel.level + 1)
  const nextLevel = PLAYER_LEVELS.find(l => l.level === currentLevel.level + 1);

  if (!nextLevel) {
    // Player is at max level
    return {
      currentLevel,
      nextLevel: undefined,
      currentScore: adjustedScore,
      progress: 100,
      pointsToNext: 0,
    };
  }

  const scoreInCurrentLevel = adjustedScore - currentLevel.pointsNeeded;
  const levelRange = nextLevel.pointsNeeded - currentLevel.pointsNeeded;
  const progress = Math.min(100, Math.max(0, (scoreInCurrentLevel / levelRange) * 100));
  const pointsToNext = Math.max(0, nextLevel.pointsNeeded - adjustedScore);

  return {
    currentLevel,
    nextLevel,
    currentScore: adjustedScore,
    progress,
    pointsToNext,
  };
}

/**
 * Gets a level by its level number
 * @param level - The level number (1-31)
 * @returns The level at the specified number, or undefined if not found
 */
export function getLevelByIndex(level: number): PlayerLevel | undefined {
  return PLAYER_LEVELS.find(l => l.level === level);
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