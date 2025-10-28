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
      .order('level_index', { ascending: true });

    expect(error).toBeNull();
    expect(dbLevels).toBeDefined();
    expect(dbLevels).toHaveLength(PLAYER_LEVELS.length);

    // Compare each level
    PLAYER_LEVELS.forEach((tsLevel, index) => {
      const dbLevel = dbLevels![index];

      expect(dbLevel.level_index).toBe(tsLevel.index);
      expect(dbLevel.emoji).toBe(tsLevel.emoji);
      expect(dbLevel.name).toBe(tsLevel.name);
      expect(dbLevel.min_score).toBe(tsLevel.minScore);

      // Handle undefined/null for max level
      if (tsLevel.maxScore === undefined) {
        expect(dbLevel.max_score).toBeNull();
      } else {
        expect(dbLevel.max_score).toBe(tsLevel.maxScore);
      }
    });
  });

  it('should have calculate_trust_level function returning correct level indexes', async () => {
    // Test various scores to ensure function works correctly
    const testCases = [
      { score: 0, expectedLevel: 0 }, // Plankton
      { score: 25, expectedLevel: 0 }, // Still Plankton
      { score: 50, expectedLevel: 1 }, // Hermit Crab
      { score: 100, expectedLevel: 2 }, // Shrimp
      { score: 1500, expectedLevel: 8 }, // Clownfish
      { score: 2000, expectedLevel: 9 }, // Tuna
      { score: 35000, expectedLevel: 19 }, // Whale
      { score: 100000, expectedLevel: 19 }, // Still Whale (max level)
      { score: -100, expectedLevel: 0 }, // Negative scores default to 0
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
