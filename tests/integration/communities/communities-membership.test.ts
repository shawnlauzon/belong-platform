import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { cleanupAllTestData, cleanupMembership } from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { Community } from '@/features';

describe('Communities API - Membership Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser1: User;
  let testUser2: User;
  let membershipTestCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared users first
    testUser1 = await createTestUser(supabase);

    // Create community with testUser1 as organizer
    membershipTestCommunity = await createTestCommunity(supabase);

    testUser2 = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('joinCommunity', () => {
    beforeEach(async () => {
      await cleanupMembership(membershipTestCommunity.id, testUser2.id);
    });

    it('adds user as member', async () => {
      const membership = await api.joinCommunity(
        supabase,
        membershipTestCommunity.id,
      );

      expect(membership!.userId).toBe(testUser2.id);
      expect(membership!.communityId).toBe(membershipTestCommunity.id);

      const { data } = await supabase
        .from('community_memberships')
        .select()
        .eq('community_id', membershipTestCommunity.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(data).toBeTruthy();
    });

    it('prevents duplicate membership', async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);

      try {
        // Second join should fail
        await expect(
          api.joinCommunity(supabase, membershipTestCommunity.id),
        ).rejects.toThrow();
      } finally {
        await cleanupMembership(membershipTestCommunity.id, testUser2.id);
      }
    });

    it('fails with invalid community id', async () => {
      await expect(
        api.joinCommunity(supabase, 'invalid-community-id'),
      ).rejects.toThrow();
    });
  });

  describe('leave community tests ', () => {
    beforeEach(async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);
    });

    afterEach(async () => {
      await cleanupMembership(membershipTestCommunity.id, testUser2.id);
    });

    it('leaving the community removes membership', async () => {
      await api.leaveCommunity(supabase, membershipTestCommunity.id);

      try {
        const { data } = await supabase
          .from('community_memberships')
          .select()
          .eq('community_id', membershipTestCommunity.id)
          .eq('user_id', testUser2.id)
          .maybeSingle();

        expect(data).toBeNull();
      } finally {
        await api.joinCommunity(supabase, membershipTestCommunity.id);
      }
    });
  });

  describe('community membership tests', () => {
    beforeAll(async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);
    });

    afterAll(async () => {
      await api.leaveCommunity(supabase, membershipTestCommunity.id);
    });

    it('returns members with user data', async () => {
      const members = await api.fetchCommunityMemberships(
        supabase,
        membershipTestCommunity.id,
      );

      expect(members).toContainEqual({
        userId: testUser2.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        communityId: membershipTestCommunity.id,
      });
    });

    it('includes organizer as a member', async () => {
      const members = await api.fetchCommunityMemberships(
        supabase,
        membershipTestCommunity.id,
      );

      expect(members).toContainEqual({
        userId: testUser1.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        communityId: membershipTestCommunity.id,
      });
    });

    it('returns communities for user', async () => {
      const memberships = await api.fetchUserCommunities(
        supabase,
        testUser2.id,
      );
      expect(memberships).toHaveLength(1);
      expect(memberships).toContainEqual({
        userId: testUser2.id,
        communityId: membershipTestCommunity.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('includes community for organizer', async () => {
      const communities = await api.fetchUserCommunities(
        supabase,
        testUser1.id,
      );

      expect(communities).toContainEqual({
        userId: testUser1.id,
        communityId: membershipTestCommunity.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
