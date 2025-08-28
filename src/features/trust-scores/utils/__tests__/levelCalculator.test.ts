import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  getProgressToNextLevel,
  getLevelByIndex,
  getTotalLevels,
  getAllLevels,
} from '../levelCalculator';

describe('levelCalculator', () => {
  describe('calculateLevel', () => {
    it('should return Plankton for 0 score', () => {
      const level = calculateLevel(0);
      expect(level.name).toBe('Plankton');
      expect(level.emoji).toBe('🦠');
      expect(level.index).toBe(0);
    });

    it('should return Plankton for negative score', () => {
      const level = calculateLevel(-100);
      expect(level.name).toBe('Plankton');
      expect(level.index).toBe(0);
    });

    it('should return Hermit Crab for 50 points (joined community)', () => {
      const level = calculateLevel(50);
      expect(level.name).toBe('Hermit Crab');
      expect(level.emoji).toBe('🐚');
      expect(level.index).toBe(1);
    });

    it('should return Shrimp for 100 points (received shoutout)', () => {
      const level = calculateLevel(100);
      expect(level.name).toBe('Shrimp');
      expect(level.emoji).toBe('🦐');
      expect(level.index).toBe(2);
    });

    it('should return Jellyfish for 1000 points (community creator)', () => {
      const level = calculateLevel(1000);
      expect(level.name).toBe('Jellyfish');
      expect(level.emoji).toBe('🪼');
      expect(level.index).toBe(7);
    });

    it('should return Whale for max level score', () => {
      const level = calculateLevel(35000);
      expect(level.name).toBe('Whale');
      expect(level.emoji).toBe('🐋');
      expect(level.index).toBe(19);
    });

    it('should return Whale for scores above max threshold', () => {
      const level = calculateLevel(100000);
      expect(level.name).toBe('Whale');
      expect(level.index).toBe(19);
    });

    it('should return correct level at boundary values', () => {
      // Test exact boundary values
      expect(calculateLevel(49).name).toBe('Plankton');
      expect(calculateLevel(50).name).toBe('Hermit Crab');
      expect(calculateLevel(99).name).toBe('Hermit Crab');
      expect(calculateLevel(100).name).toBe('Shrimp');
    });

    it('should correctly handle all levels', () => {
      const testCases = [
        { score: 0, expectedName: 'Plankton' },
        { score: 75, expectedName: 'Hermit Crab' },
        { score: 150, expectedName: 'Shrimp' },
        { score: 250, expectedName: 'Crab' },
        { score: 400, expectedName: 'Sea Snail' },
        { score: 600, expectedName: 'Lobster' },
        { score: 800, expectedName: 'Starfish' },
        { score: 1200, expectedName: 'Jellyfish' },
        { score: 1700, expectedName: 'Clownfish' },
        { score: 2500, expectedName: 'Tuna' },
        { score: 3500, expectedName: 'Pufferfish' },
        { score: 4500, expectedName: 'Squid' },
        { score: 6000, expectedName: 'Octopus' },
        { score: 8500, expectedName: 'Sea Turtle' },
        { score: 11000, expectedName: 'Sea Otter' },
        { score: 15000, expectedName: 'Penguin' },
        { score: 19000, expectedName: 'Seal' },
        { score: 25000, expectedName: 'Shark' },
        { score: 30000, expectedName: 'Dolphin' },
        { score: 40000, expectedName: 'Whale' },
      ];

      testCases.forEach(({ score, expectedName }) => {
        const level = calculateLevel(score);
        expect(level.name).toBe(expectedName);
      });
    });
  });

  describe('getProgressToNextLevel', () => {
    it('should show 0% progress at level start', () => {
      const progress = getProgressToNextLevel(50);
      expect(progress.currentLevel.name).toBe('Hermit Crab');
      expect(progress.nextLevel?.name).toBe('Shrimp');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(50);
    });

    it('should show 50% progress halfway through level', () => {
      const progress = getProgressToNextLevel(75);
      expect(progress.currentLevel.name).toBe('Hermit Crab');
      expect(progress.nextLevel?.name).toBe('Shrimp');
      expect(progress.progress).toBe(50);
      expect(progress.pointsToNext).toBe(25);
    });

    it('should show 100% progress at max level', () => {
      const progress = getProgressToNextLevel(35000);
      expect(progress.currentLevel.name).toBe('Whale');
      expect(progress.nextLevel).toBeUndefined();
      expect(progress.progress).toBe(100);
      expect(progress.pointsToNext).toBe(0);
    });

    it('should calculate progress correctly for various scores', () => {
      // Test at 20% through Shrimp level (100-200 range)
      const progress1 = getProgressToNextLevel(120);
      expect(progress1.currentLevel.name).toBe('Shrimp');
      expect(progress1.progress).toBe(20);
      expect(progress1.pointsToNext).toBe(80);

      // Test at 80% through Crab level (200-350 range)
      const progress2 = getProgressToNextLevel(320);
      expect(progress2.currentLevel.name).toBe('Crab');
      expect(Math.round(progress2.progress)).toBe(80);
      expect(progress2.pointsToNext).toBe(30);
    });

    it('should handle 0 score correctly', () => {
      const progress = getProgressToNextLevel(0);
      expect(progress.currentLevel.name).toBe('Plankton');
      expect(progress.nextLevel?.name).toBe('Hermit Crab');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(50);
    });

    it('should handle negative score', () => {
      const progress = getProgressToNextLevel(-10);
      expect(progress.currentLevel.name).toBe('Plankton');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(50);
    });
  });

  describe('getLevelByIndex', () => {
    it('should return correct level by index', () => {
      const level0 = getLevelByIndex(0);
      expect(level0?.name).toBe('Plankton');

      const level5 = getLevelByIndex(5);
      expect(level5?.name).toBe('Lobster');

      const level19 = getLevelByIndex(19);
      expect(level19?.name).toBe('Whale');
    });

    it('should return undefined for invalid indices', () => {
      expect(getLevelByIndex(-1)).toBeUndefined();
      expect(getLevelByIndex(20)).toBeUndefined();
      expect(getLevelByIndex(100)).toBeUndefined();
    });
  });

  describe('getTotalLevels', () => {
    it('should return 20', () => {
      expect(getTotalLevels()).toBe(20);
    });
  });

  describe('getAllLevels', () => {
    it('should return all 20 levels', () => {
      const levels = getAllLevels();
      expect(levels).toHaveLength(20);
      expect(levels[0].name).toBe('Plankton');
      expect(levels[19].name).toBe('Whale');
    });

    it('should return levels in correct order', () => {
      const levels = getAllLevels();
      for (let i = 0; i < levels.length; i++) {
        expect(levels[i].index).toBe(i);
      }
    });
  });
});