import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Trust Scores - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchTrustScores', () => {
    it('should return empty array when user has no trust scores', async () => {
      const account = await createTestUser(supabase);

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toEqual([]);
    });

    it('should fetch automatically created trust scores', async () => {
      const account = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);
      
      // Allow time for triggers to complete

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toHaveLength(1);
      expect(trustScores[0]).toMatchObject({
        userId: account.id,
        communityId: community.id,
        score: 1050, // 1000 (creation) + 50 (join)
        lastCalculatedAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should fetch trust scores from multiple communities', async () => {
      const account = await createTestUser(supabase);

      const community1 = await createTestCommunity(supabase);
      const community2 = await createTestCommunity(supabase);
      
      // Allow time for triggers to complete

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toHaveLength(2);

      // Should contain both communities' scores
      const communityIds = trustScores.map((ts) => ts.communityId);
      expect(communityIds).toContain(community1.id);
      expect(communityIds).toContain(community2.id);

      // Both should have the same score from automatic creation
      trustScores.forEach((score) => {
        expect(score.score).toBe(1050); // 1000 (creation) + 50 (join)
      });
    });
  });

  describe('RLS Policies', () => {
    it('should only return trust scores for the authenticated user', async () => {
      // Create first user and their community
      const account1 = await createTestUser(supabase);
      const community1 = await createTestCommunity(supabase);
      
      // Create second user and their community
      const account2 = await createTestUser(supabase);
      const community2 = await createTestCommunity(supabase);
      
      // Allow time for triggers to complete

      // User1 should only see their own trust score
      await supabase.auth.signInWithPassword({
        email: account1.email,
        password: 'TestPass123!',
      });
      const account1Scores = await fetchTrustScores(supabase, account1.id);
      expect(account1Scores).toHaveLength(1);
      expect(account1Scores[0]).toMatchObject({
        userId: account1.id,
        communityId: community1.id,
        score: 1050,
      });

      // User2 should only see their own trust score
      await supabase.auth.signInWithPassword({
        email: account2.email,
        password: 'TestPass123!',
      });
      const account2Scores = await fetchTrustScores(supabase, account2.id);
      expect(account2Scores).toHaveLength(1);
      expect(account2Scores[0]).toMatchObject({
        userId: account2.id,
        communityId: community2.id,
        score: 1050,
      });
    });
  });

  describe('Score Retrieval', () => {
    it('should fetch trust scores with all required fields', async () => {
      const account = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);
      
      // Allow time for triggers to complete

      const trustScores = await fetchTrustScores(supabase, account.id);
      
      expect(trustScores).toHaveLength(1);
      expect(trustScores[0]).toMatchObject({
        userId: account.id,
        communityId: community.id,
        score: 1050,
        lastCalculatedAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
