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
      expect(level.level).toBe(1);
    });

    it('should return Plankton for negative score', () => {
      const level = calculateLevel(-100);
      expect(level.name).toBe('Plankton');
      expect(level.level).toBe(1);
    });

    it('should return Plankton for 50 points (below Hatchling)', () => {
      const level = calculateLevel(50);
      expect(level.name).toBe('Plankton');
      expect(level.emoji).toBe('🦠');
      expect(level.level).toBe(1);
    });

    it('should return Hatchling for 100 points', () => {
      const level = calculateLevel(100);
      expect(level.name).toBe('Hatchling');
      expect(level.emoji).toBe('🐣');
      expect(level.level).toBe(2);
    });

    it('should return Jellyfish for 1095 points', () => {
      const level = calculateLevel(1095);
      expect(level.name).toBe('Jellyfish');
      expect(level.emoji).toBe('🪼');
      expect(level.level).toBe(6);
    });

    it('should return Infinity for max level score', () => {
      const level = calculateLevel(6050108);
      expect(level.name).toBe('Infinity');
      expect(level.emoji).toBe('♾️');
      expect(level.level).toBe(31);
    });

    it('should return Infinity for scores above max threshold', () => {
      const level = calculateLevel(10000000);
      expect(level.name).toBe('Infinity');
      expect(level.level).toBe(31);
    });

    it('should return correct level at boundary values', () => {
      // Test exact boundary values
      expect(calculateLevel(99).name).toBe('Plankton');
      expect(calculateLevel(100).name).toBe('Hatchling');
      expect(calculateLevel(239).name).toBe('Hatchling');
      expect(calculateLevel(240).name).toBe('Shrimp');
    });

    it('should correctly handle all levels', () => {
      const testCases = [
        { score: 0, expectedName: 'Plankton' },
        { score: 100, expectedName: 'Hatchling' },
        { score: 240, expectedName: 'Shrimp' },
        { score: 436, expectedName: 'Crab' },
        { score: 710, expectedName: 'Lobster' },
        { score: 1095, expectedName: 'Jellyfish' },
        { score: 1632, expectedName: 'Angelfish' },
        { score: 2385, expectedName: 'Pufferfish' },
        { score: 3439, expectedName: 'Big Tuna' },
        { score: 4915, expectedName: 'Squid' },
        { score: 6981, expectedName: 'Sea Turtle' },
        { score: 9874, expectedName: 'Octopus' },
        { score: 13923, expectedName: 'Otter' },
        { score: 19593, expectedName: 'Seal' },
        { score: 27530, expectedName: 'Penguin' },
        { score: 38642, expectedName: 'Dolphin' },
        { score: 54199, expectedName: 'Orca' },
        { score: 75978, expectedName: 'Sperm Whale' },
        { score: 106470, expectedName: 'Blue Whale' },
        { score: 149158, expectedName: 'Mermaid' },
        { score: 208921, expectedName: 'Ocean' },
        { score: 292589, expectedName: 'Poseidon' },
        { score: 409724, expectedName: 'Gaia' },
        { score: 573714, expectedName: 'Moon' },
        { score: 803300, expectedName: 'Sun' },
        { score: 1124720, expectedName: 'Solar System' },
        { score: 1574708, expectedName: 'Shooting Star' },
        { score: 2204691, expectedName: 'Comet' },
        { score: 3086667, expectedName: 'North Star' },
        { score: 4321434, expectedName: 'Galaxy' },
        { score: 6050108, expectedName: 'Infinity' },
      ];

      testCases.forEach(({ score, expectedName }) => {
        const level = calculateLevel(score);
        expect(level.name).toBe(expectedName);
      });
    });
  });

  describe('getProgressToNextLevel', () => {
    it('should show 0% progress at level start', () => {
      const progress = getProgressToNextLevel(100);
      expect(progress.currentLevel.name).toBe('Hatchling');
      expect(progress.nextLevel?.name).toBe('Shrimp');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(140);
    });

    it('should show 50% progress halfway through level', () => {
      const progress = getProgressToNextLevel(170);
      expect(progress.currentLevel.name).toBe('Hatchling');
      expect(progress.nextLevel?.name).toBe('Shrimp');
      expect(progress.progress).toBe(50);
      expect(progress.pointsToNext).toBe(70);
    });

    it('should show 100% progress at max level', () => {
      const progress = getProgressToNextLevel(6050108);
      expect(progress.currentLevel.name).toBe('Infinity');
      expect(progress.nextLevel).toBeUndefined();
      expect(progress.progress).toBe(100);
      expect(progress.pointsToNext).toBe(0);
    });

    it('should calculate progress correctly for various scores', () => {
      // Test at 20% through Shrimp level (240-436 range, 196 points)
      const progress1 = getProgressToNextLevel(279);
      expect(progress1.currentLevel.name).toBe('Shrimp');
      expect(Math.round(progress1.progress)).toBe(20);
      expect(progress1.pointsToNext).toBe(157);

      // Test at 80% through Crab level (436-710 range, 274 points)
      const progress2 = getProgressToNextLevel(655);
      expect(progress2.currentLevel.name).toBe('Crab');
      expect(Math.round(progress2.progress)).toBe(80);
      expect(progress2.pointsToNext).toBe(55);
    });

    it('should handle 0 score correctly', () => {
      const progress = getProgressToNextLevel(0);
      expect(progress.currentLevel.name).toBe('Plankton');
      expect(progress.nextLevel?.name).toBe('Hatchling');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(100);
    });

    it('should handle negative score', () => {
      const progress = getProgressToNextLevel(-10);
      expect(progress.currentLevel.name).toBe('Plankton');
      expect(progress.progress).toBe(0);
      expect(progress.pointsToNext).toBe(100);
    });
  });

  describe('getLevelByIndex', () => {
    it('should return correct level by level number', () => {
      const level1 = getLevelByIndex(1);
      expect(level1?.name).toBe('Plankton');

      const level5 = getLevelByIndex(5);
      expect(level5?.name).toBe('Lobster');

      const level31 = getLevelByIndex(31);
      expect(level31?.name).toBe('Infinity');
    });

    it('should return undefined for invalid level numbers', () => {
      expect(getLevelByIndex(0)).toBeUndefined();
      expect(getLevelByIndex(-1)).toBeUndefined();
      expect(getLevelByIndex(32)).toBeUndefined();
      expect(getLevelByIndex(100)).toBeUndefined();
    });
  });

  describe('getTotalLevels', () => {
    it('should return 31', () => {
      expect(getTotalLevels()).toBe(31);
    });
  });

  describe('getAllLevels', () => {
    it('should return all 31 levels', () => {
      const levels = getAllLevels();
      expect(levels).toHaveLength(31);
      expect(levels[0].name).toBe('Plankton');
      expect(levels[30].name).toBe('Infinity');
    });

    it('should return levels in correct order', () => {
      const levels = getAllLevels();
      for (let i = 0; i < levels.length; i++) {
        expect(levels[i].level).toBe(i + 1);
      }
    });
  });
});