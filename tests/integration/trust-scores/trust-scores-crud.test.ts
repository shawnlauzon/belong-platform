import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Trust Scores Integration Tests - CRUD Operations', () => {
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
    // Clean up test data before each test
    await cleanupAllTestData();
  });

  describe('fetchTrustScores', () => {
    it('should return empty array when user has no trust scores', async () => {
      const account = await createTestUser(supabase);

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toEqual([]);
    });

    it('should fetch trust scores for authenticated user', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Insert a test trust score directly into database
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: 100,
          last_calculated_at: new Date().toISOString(),
        });

      expect(insertError).toBeNull();

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toHaveLength(1);
      expect(trustScores[0]).toMatchObject({
        userId: account.id,
        communityId: community.id,
        score: 100,
      });
      expect(trustScores[0].lastCalculatedAt).toBeDefined();
      expect(trustScores[0].createdAt).toBeDefined();
      expect(trustScores[0].updatedAt).toBeDefined();
    });

    it('should fetch multiple trust scores for different communities', async () => {
      const account = await createTestUser(supabase);

      const community1 = await createTestCommunity(supabase);
      const community2 = await createTestCommunity(supabase);

      // Insert trust scores for both communities
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert([
          {
            user_id: account.id,
            community_id: community1.id,
            score: 150,
            last_calculated_at: new Date().toISOString(),
          },
          {
            user_id: account.id,
            community_id: community2.id,
            score: 75,
            last_calculated_at: new Date().toISOString(),
          },
        ]);

      expect(insertError).toBeNull();

      const trustScores = await fetchTrustScores(supabase, account.id);

      expect(trustScores).toHaveLength(2);

      // Should contain both communities' scores
      const communityIds = trustScores.map((ts) => ts.communityId);
      expect(communityIds).toContain(community1.id);
      expect(communityIds).toContain(community2.id);

      // Verify scores
      const score1 = trustScores.find((ts) => ts.communityId === community1.id);
      const score2 = trustScores.find((ts) => ts.communityId === community2.id);
      expect(score1?.score).toBe(150);
      expect(score2?.score).toBe(75);
    });
  });

  describe('RLS Policies', () => {
    it('should only return trust scores for the authenticated user', async () => {
      // Create two users
      const account1 = await createTestUser(supabase);
      const account2 = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Insert trust scores for both users using service client
      const { error } = await serviceClient.from('trust_scores').insert([
        {
          user_id: account1.id,
          community_id: community.id,
          score: 100,
        },
        {
          user_id: account2.id,
          community_id: community.id,
          score: 200,
        },
      ]);

      expect(error).toBeNull();

      // User1 should only see their own trust score when signed in as account1
      await supabase.auth.signInWithPassword({
        email: account1.email,
        password: 'TestPass123!',
      });
      const account1Scores = await fetchTrustScores(supabase, account1.id);
      expect(account1Scores).toHaveLength(1);
      expect(account1Scores[0].userId).toBe(account1.id);
      expect(account1Scores[0].score).toBe(100);

      // User2 should only see their own trust score when signed in as account2
      await supabase.auth.signInWithPassword({
        email: account2.email,
        password: 'TestPass123!',
      });
      const account2Scores = await fetchTrustScores(supabase, account2.id);
      expect(account2Scores).toHaveLength(1);
      expect(account2Scores[0].userId).toBe(account2.id);
      expect(account2Scores[0].score).toBe(200);
    });
  });

  describe('Data Validation', () => {
    it('should require valid user_id', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Try to insert with invalid user_id
      const { error } = await serviceClient.from('trust_scores').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Non-existent user
        community_id: community.id,
        score: 100,
      });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('violates foreign key constraint');
    });

    it('should require valid community_id', async () => {
      const account = await createTestUser(supabase);

      // Try to insert with invalid community_id
      const { error } = await serviceClient.from('trust_scores').insert({
        user_id: account.id,
        community_id: '00000000-0000-0000-0000-000000000000', // Non-existent community
        score: 100,
      });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('violates foreign key constraint');
    });

    it('should enforce unique constraint on user_id and community_id', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Insert first trust score
      const { error: firstError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: 100,
        });

      expect(firstError).toBeNull();

      // Try to insert duplicate
      const { error: duplicateError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: 150,
        });

      expect(duplicateError).toBeTruthy();
      expect(duplicateError?.message).toContain(
        'duplicate key value violates unique constraint',
      );
    });

    it('should handle score updates correctly', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Insert initial trust score
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: 100,
        });

      expect(insertError).toBeNull();

      // Update the score
      const { error: updateError } = await serviceClient
        .from('trust_scores')
        .update({
          score: 200,
          last_calculated_at: new Date().toISOString(),
        })
        .eq('user_id', account.id)
        .eq('community_id', community.id);

      expect(updateError).toBeNull();

      // Verify the update
      const trustScores = await fetchTrustScores(supabase, account.id);
      expect(trustScores).toHaveLength(1);
      expect(trustScores[0].score).toBe(200);
      expect(trustScores[0].lastCalculatedAt).not.toBeNull();
    });

    it('should maintain referential integrity when community is deleted', async () => {
      const account = await createTestUser(supabase);

      const community = await createTestCommunity(supabase);

      // Insert trust score
      const { error: insertError } = await serviceClient
        .from('trust_scores')
        .insert({
          user_id: account.id,
          community_id: community.id,
          score: 100,
        });

      expect(insertError).toBeNull();

      // Delete the community
      const { error: deleteError } = await supabase
        .from('communities')
        .delete()
        .eq('id', community.id);

      expect(deleteError).toBeNull();

      // Trust score should be deleted due to CASCADE
      const trustScores = await fetchTrustScores(supabase, account.id);
      expect(trustScores).toHaveLength(0);
    });
  });
});
