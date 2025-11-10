import { describe, it, expect, beforeAll } from 'vitest';
import { createServiceClient } from '../helpers/test-client';
import { PLAYER_LEVELS } from '@/features/trust-scores/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Player Levels - Database Sync', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createServiceClient();
  });

  it('should have database player_levels table matching TypeScript PLAYER_LEVELS config', async () => {
    // Query all player levels from database
    const { data: dbLevels, error } = await supabase
      .from('player_levels')
      .select('*')
      .order('level', { ascending: true });

    expect(error).toBeNull();
    expect(dbLevels).toBeDefined();
    expect(dbLevels).toHaveLength(PLAYER_LEVELS.length);

    // Compare each level
    PLAYER_LEVELS.forEach((tsLevel, index) => {
      const dbLevel = dbLevels![index];

      expect(dbLevel.level).toBe(tsLevel.level);
      expect(dbLevel.emoji).toBe(tsLevel.emoji);
      expect(dbLevel.name).toBe(tsLevel.name);
      expect(dbLevel.points_needed).toBe(tsLevel.pointsNeeded);

      // Handle undefined/null for unlocked_powers
      if (tsLevel.unlockedPowers === undefined) {
        expect(dbLevel.unlocked_powers).toBeNull();
      } else {
        expect(dbLevel.unlocked_powers).toEqual(tsLevel.unlockedPowers);
      }
    });
  });

  it('should have calculate_trust_level function returning correct level numbers', async () => {
    // Test various scores to ensure function works correctly
    const testCases = [
      { score: 0, expectedLevel: 1 }, // Plankton
      { score: 50, expectedLevel: 1 }, // Still Plankton
      { score: 100, expectedLevel: 2 }, // Hatchling
      { score: 240, expectedLevel: 3 }, // Shrimp
      { score: 1632, expectedLevel: 7 }, // Angelfish
      { score: 3439, expectedLevel: 9 }, // Big Tuna
      { score: 6050108, expectedLevel: 31 }, // Infinity
      { score: 10000000, expectedLevel: 31 }, // Still Infinity (max level)
      { score: -100, expectedLevel: 1 }, // Negative scores default to level 1
    ];

    for (const { score, expectedLevel } of testCases) {
      const { data, error } = await supabase.rpc('calculate_trust_level', {
        p_score: score,
      });

      expect(error).toBeNull();
      expect(data).toBe(expectedLevel);
    }
  });
});
