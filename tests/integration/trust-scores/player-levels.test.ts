import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { fetchTrustScores } from '@/features/trust-scores/api';
import {
  calculateLevel,
  getProgressToNextLevel,
} from '@/features/trust-scores/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Trust Scores - Player Levels', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Basic Level Calculations', () => {
    it('should calculate level for new user with zero score', async () => {
      const level = calculateLevel(0);
      const progress = getProgressToNextLevel(0);

      expect(level).toMatchObject({
        name: expect.any(String),
        minScore: 0,
        emoji: expect.any(String),
        index: 0,
      });

      expect(progress).toMatchObject({
        currentLevel: level,
        progress: expect.any(Number),
      });
    });

    it('should calculate level for active community member', async () => {
      const activeUserScore = 150; // Realistic score for active member
      const level = calculateLevel(activeUserScore);
      const progress = getProgressToNextLevel(activeUserScore);

      expect(level).toMatchObject({
        name: expect.any(String),
        minScore: expect.any(Number),
        emoji: expect.any(String),
      });

      expect(progress).toMatchObject({
        currentLevel: level,
        progress: expect.any(Number),
      });
      expect(level.minScore).toBeLessThanOrEqual(activeUserScore);
    });
  });

  describe('Multi-Community Level Tracking', () => {
    it('should show higher level when user gains more points', async () => {
      const account = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);

      // Allow time for triggers to complete

      // Get initial automatically created score
      const initialScores = await fetchTrustScores(supabase, account.id);
      const initialScore = initialScores[0].score; // Should be 1000
      const initialLevel = calculateLevel(initialScore);

      // Simulate gaining more points (e.g., from resource offers)
      const newScore = initialScore + 100; // Add 100 more points
      const { error: updateError } = await serviceClient
        .from('trust_scores')
        .update({
          score: newScore,
          last_calculated_at: new Date().toISOString(),
        })
        .eq('user_id', account.id)
        .eq('community_id', community.id);

      expect(updateError).toBeNull();

      const newLevel = calculateLevel(newScore);

      // New level should be same or higher than initial
      expect(newLevel.minScore).toBeGreaterThanOrEqual(initialLevel.minScore);
      expect(newScore).toBe(1100);
    });
  });

  describe('Level Display', () => {
    it('should provide level information for user dashboard', async () => {
      const userScore = 125; // Realistic score for regular user
      const level = calculateLevel(userScore);
      const progress = getProgressToNextLevel(userScore);

      // Verify level has all info needed for UI display
      expect(level).toMatchObject({
        name: expect.any(String),
        minScore: expect.any(Number),
        emoji: expect.any(String),
        index: expect.any(Number),
      });

      // Verify progress info for progress bar
      expect(progress).toMatchObject({
        currentLevel: level,
        progress: expect.any(Number),
      });

      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });
  });
});
