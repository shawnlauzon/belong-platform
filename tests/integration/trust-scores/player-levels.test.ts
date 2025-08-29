import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { fetchTrustScores } from '@/features/trust-scores/api';
import {
  calculateLevel,
  getProgressToNextLevel,
  getAllLevels,
} from '@/features/trust-scores/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Trust Scores Integration Tests - Player Levels', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await cleanupAllTestData();
  });

  describe('Level Calculations with Real Data', () => {
    it('should calculate correct levels for various trust scores', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Test different score levels
      const testScores = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500];

      for (const score of testScores) {
        // Update/insert trust score
        const { error: upsertError } = await serviceClient
          .from('trust_scores')
          .upsert({
            user_id: account.id,
            community_id: community.id,
            score: score,
            last_calculated_at: new Date().toISOString(),
          });

        expect(upsertError).toBeNull();

        // Fetch and verify level calculation
        const trustScores = await fetchTrustScores(supabase, account.id);
        expect(trustScores).toHaveLength(1);

        const level = calculateLevel(score);
        expect(level.name).toBeDefined();
        expect(level.minScore).toBeLessThanOrEqual(score);
        expect(level.emoji).toBeDefined();

        // Verify progress calculation
        const progress = getProgressToNextLevel(score);
        expect(progress.currentLevel).toEqual(level);
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Multi-Community Level Tracking', () => {
    it('should track different levels across multiple communities', async () => {
      const account = await createTestUser(supabase);

      const community1 = await createTestCommunity(supabase);
      const community2 = await createTestCommunity(supabase);
      const community3 = await createTestCommunity(supabase);

      // Set different scores for each community
      const communityScores = [
        { community: community1, score: 100 }, // Should be "Shrimp" level
        { community: community2, score: 400 }, // Should be "Sea Snail" level
        { community: community3, score: 1000 }, // Should be "Jellyfish" level
      ];

      // Insert scores for all communities
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert(
          communityScores.map((cs) => ({
            user_id: account.id,
            community_id: cs.community.id,
            score: cs.score,
            last_calculated_at: new Date().toISOString(),
          })),
        );

      expect(insertError).toBeNull();

      // Fetch and verify all scores
      const trustScores = await fetchTrustScores(supabase, account.id);
      expect(trustScores).toHaveLength(3);

      // Verify each community has correct level
      for (const { community, score } of communityScores) {
        const trustScore = trustScores.find(
          (ts) => ts.communityId === community.id,
        );
        expect(trustScore).toBeDefined();
        expect(trustScore!.score).toBe(score);

        const level = calculateLevel(score);
        const progress = getProgressToNextLevel(score);

        // Verify level is calculated correctly
        expect(level.minScore).toBeLessThanOrEqual(score);
        expect(progress.currentLevel).toEqual(level);
        expect(progress.progress).toBeGreaterThanOrEqual(0);
        expect(progress.progress).toBeLessThanOrEqual(100);
      }
    });

    it('should handle level updates when scores change over time', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Start with low score
      let currentScore = 50;
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: currentScore,
          last_calculated_at: new Date().toISOString(),
        });

      expect(insertError).toBeNull();

      // Simulate score progression over time
      const scoreProgression = [100, 250, 500, 800, 1200, 2000];

      for (const newScore of scoreProgression) {
        const { error: updateError } = await serviceClient
          .from('trust_scores')
          .update({
            score: newScore,
            last_calculated_at: new Date().toISOString(),
          })
          .eq('user_id', account.id)
          .eq('community_id', community.id);

        expect(updateError).toBeNull();

        // Verify level progression
        const trustScores = await fetchTrustScores(supabase, account.id);
        expect(trustScores).toHaveLength(1);
        expect(trustScores[0].score).toBe(newScore);

        const currentLevel = calculateLevel(currentScore);
        const newLevel = calculateLevel(newScore);

        // Score should have increased (or stayed same)
        expect(newLevel.minScore).toBeGreaterThanOrEqual(currentLevel.minScore);

        currentScore = newScore;
      }
    });
  });

  describe('Level System Integrity', () => {
    it('should have consistent level thresholds', async () => {
      const allLevels = getAllLevels();

      // Verify levels are properly ordered
      for (let i = 1; i < allLevels.length; i++) {
        expect(allLevels[i].minScore).toBeGreaterThan(
          allLevels[i - 1].minScore,
        );
      }

      // Verify first level starts at 0
      expect(allLevels[0].minScore).toBe(0);

      // Verify all levels have required properties
      allLevels.forEach((level, index) => {
        expect(level.name).toBeDefined();
        expect(level.name).toBeTruthy();
        expect(level.minScore).toBeGreaterThanOrEqual(0);
        expect(level.emoji).toBeDefined();
        expect(level.emoji).toBeTruthy();
        expect(level.index).toBe(index);
      });
    });
  });
});
